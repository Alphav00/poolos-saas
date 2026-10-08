"""Runs PHREEQC inputs through a native build of the same IPhreeqc commit.

The WebAssembly engine is checked against this: same source, same database,
different compiler. test/parity.spec.ts compares every number.

    # 1. build the native library from the pinned commit (once)
    python3 oracle/native.py build /tmp/phreeqc-native
    # 2. write the inputs (from the TypeScript module) and run them
    GOLDEN_DUMP=1 pnpm vitest run test/parity.spec.ts
    python3 oracle/native.py run /tmp/phreeqc-native

Needs git, cmake, a C++ compiler and Python 3.11+. No Python packages.
"""

import ctypes
import gzip
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
INPUTS = HERE / "inputs.json.gz"
GOLDENS = PKG / "test" / "goldens" / "native.json.gz"

def pinned_commit() -> str:
    text = (PKG / "phreeqc" / "build.sh").read_text()
    return re.search(r"^IPHREEQC_COMMIT=(\w+)$", text, re.M).group(1)

def build(work: pathlib.Path) -> None:
    work.mkdir(parents=True, exist_ok=True)
    src = work / "iphreeqc"
    if not src.exists():
        subprocess.run(["git", "init", "-q", str(src)], check=True)
        subprocess.run(["git", "-C", str(src), "remote", "add", "origin",
                        "https://github.com/usgs-coupled/iphreeqc.git"], check=True)
    subprocess.run(["git", "-C", str(src), "fetch", "-q", "--depth", "1", "origin", pinned_commit()], check=True)
    subprocess.run(["git", "-C", str(src), "checkout", "-q", "FETCH_HEAD"], check=True)
    out = work / "build-native"
    out.mkdir(exist_ok=True)
    subprocess.run(["cmake", str(src), "-DCMAKE_BUILD_TYPE=Release", "-DBUILD_SHARED_LIBS=ON",
                    "-DBUILD_TESTING=OFF"], cwd=out, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["make", "-j4", "IPhreeqc"], cwd=out, check=True, stdout=subprocess.DEVNULL)
    print(out / "libIPhreeqc.so")

def combined_database() -> bytes:
    phreeqc = (PKG / "database" / "phreeqc.dat").read_bytes()
    pool = (PKG / "database" / "pool.dat").read_bytes()
    ends = re.findall(rb"^END\r?$", phreeqc, re.M)
    assert len(ends) == 1, ends
    return re.sub(rb"^END\r?$", lambda _: pool + b"\nEND", phreeqc, count=1, flags=re.M)

def run(work: pathlib.Path) -> None:
    lib = ctypes.CDLL(str(work / "build-native" / "libIPhreeqc.so"))
    lib.CreateIPhreeqc.restype = ctypes.c_int
    lib.GetErrorString.restype = ctypes.c_char_p
    lib.GetSelectedOutputValue2.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int,
                                            ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_double),
                                            ctypes.c_char_p, ctypes.c_uint]
    pid = lib.CreateIPhreeqc()
    lib.SetErrorStringOn(pid, 1)
    # The TypeScript side encodes the Latin-1 database as UTF-8; do the same
    # so both builds parse identical bytes.
    db = combined_database().decode("latin-1").encode("utf-8")
    if lib.LoadDatabaseString(pid, db) != 0:
        sys.exit(lib.GetErrorString(pid).decode())

    cases = json.loads(gzip.decompress(INPUTS.read_bytes()))
    results = []
    vtype = ctypes.c_int()
    dval = ctypes.c_double()
    sval = ctypes.create_string_buffer(256)
    for case in cases:
        if lib.RunString(pid, case["input"].encode("utf-8")) != 0:
            results.append({"name": case["name"], "error": lib.GetErrorString(pid).decode()})
            continue
        rows = []
        for r in range(lib.GetSelectedOutputRowCount(pid)):
            row = []
            for c in range(lib.GetSelectedOutputColumnCount(pid)):
                lib.GetSelectedOutputValue2(pid, r, c, ctypes.byref(vtype), ctypes.byref(dval), sval, 256)
                row.append(dval.value if vtype.value == 3 else sval.value.decode() if vtype.value == 4 else None)
            rows.append(row)
        results.append({"name": case["name"], "rows": rows})
    GOLDENS.write_bytes(gzip.compress(json.dumps(results).encode(), mtime=0))
    print(f"wrote {len(results)} cases to {GOLDENS.relative_to(PKG)}")

if __name__ == "__main__":
    command, work = sys.argv[1], pathlib.Path(sys.argv[2])
    {"build": build, "run": run}[command](work)
