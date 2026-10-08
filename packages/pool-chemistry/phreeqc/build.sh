#!/usr/bin/env bash
# Builds USGS PHREEQC (the IPhreeqc library) to WebAssembly.
#
# The output, phreeqc.mjs + phreeqc.wasm, is committed so CI and deploys do
# not need Emscripten. Re-run this only to move to a new PHREEQC release, and
# update the pins below and BUILD.md together.
#
# Usage: phreeqc/build.sh [workdir]     (needs git, cmake, make, python3)
set -euo pipefail

IPHREEQC_REPO=https://github.com/usgs-coupled/iphreeqc.git
IPHREEQC_COMMIT=f107fcb2f2e1e3167ce4c1328e477b54dee3d21b
EMSDK_VERSION=6.0.11

here="$(cd "$(dirname "$0")" && pwd)"
work="${1:-$(mktemp -d)}"
mkdir -p "$work"
cd "$work"

[ -d emsdk ] || git clone -q https://github.com/emscripten-core/emsdk.git
./emsdk/emsdk install "$EMSDK_VERSION" >/dev/null
./emsdk/emsdk activate "$EMSDK_VERSION" >/dev/null
# shellcheck disable=SC1091
source ./emsdk/emsdk_env.sh >/dev/null 2>&1

if [ ! -d iphreeqc ]; then
  git init -q iphreeqc
  git -C iphreeqc remote add origin "$IPHREEQC_REPO"
fi
git -C iphreeqc fetch -q --depth 1 origin "$IPHREEQC_COMMIT"
git -C iphreeqc checkout -q FETCH_HEAD

# PHREEQC reports input and convergence errors by throwing C++ exceptions,
# so the library is compiled with WebAssembly exception handling.
rm -rf build-wasm && mkdir build-wasm && cd build-wasm
emcmake cmake ../iphreeqc -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF \
  -DBUILD_TESTING=OFF -DCMAKE_C_FLAGS=-fwasm-exceptions -DCMAKE_CXX_FLAGS=-fwasm-exceptions >/dev/null
emmake make -j"$(nproc)" IPhreeqc >/dev/null

exports=_CreateIPhreeqc,_DestroyIPhreeqc,_LoadDatabaseString,_RunString,_GetErrorString,_GetWarningString
exports=$exports,_GetSelectedOutputRowCount,_GetSelectedOutputColumnCount,_GetSelectedOutputValue2
exports=$exports,_SetErrorStringOn,_SetOutputStringOn,_malloc,_free

# ENVIRONMENT=web keeps Node and file-system loaders out of the glue code; the
# caller always hands over a compiled WebAssembly.Module (see src/engine.ts).
em++ -O2 -fwasm-exceptions libIPhreeqc.a -o phreeqc.mjs \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web -sALLOW_MEMORY_GROWTH=1 \
  -sDYNAMIC_EXECUTION=0 -sTEXTDECODER=2 \
  -sEXPORTED_FUNCTIONS="$exports" \
  -sEXPORTED_RUNTIME_METHODS=UTF8ToString,stringToNewUTF8,HEAP32,HEAPF64 \
  -sINCOMING_MODULE_JS_API=instantiateWasm,print,printErr

cp phreeqc.mjs phreeqc.wasm "$here/"
cp ../iphreeqc/database/phreeqc.dat "$here/../database/phreeqc.dat"
cd "$here"
sha256sum phreeqc.mjs phreeqc.wasm ../database/phreeqc.dat
