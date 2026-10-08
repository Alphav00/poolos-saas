# @poolos/pool-chemistry

Pool water chemistry on **USGS PHREEQC**, compiled to WebAssembly so it runs
inside the PoolOS Worker (and, later, on the phone).

PHREEQC is the U.S. Geological Survey's program for water equilibrium
chemistry, and the standard tool for saturation indices. It is public domain.
This package adds no chemistry of its own: it turns pool readings into
PHREEQC input, reads the answers back and converts units.

## What it answers

| Call | Gives | How |
|---|---|---|
| `analyze(water)` | calcite saturation index, ionic strength, alkalinity split (carbonate, cyanurate, borate, chlorine, water), chlorine split (HOCl, OCl⁻, held by CYA) | PHREEQC speciation |
| `acidToPh` | muriatic acid to reach a target pH, and the water after | PHREEQC titration (fixed-pH phase) |
| `sodaAshToPh` | soda ash to reach a target pH, and the water after | PHREEQC titration |
| `bicarbonateToAlkalinity`, `calciumChlorideToHardness`, `cyanuricAcidToTarget`, `saltToTarget` | amount to add, and the water after | stoichiometry; water after from PHREEQC |
| `liquidChlorineDose` | volume of liquid chlorine | definition of trade percent |

Each answer is either `{ ok: true, value }` or `{ ok: false, questions }`.
Missing or impossible readings, and product facts not taken from a label,
come back as questions. There are no built-in product defaults.
Every analysis carries the exact PHREEQC input, the engine commit and the
database hashes, so any number can be re-run by hand.

The Worker serves it at `/api/chem/engine`, `/api/chem/analyze` and
`/api/chem/dose` (see `apps/api/src/chem.ts`).

## Where the numbers come from

- **Engine:** IPhreeqc at commit `f107fcb2…` (`phreeqc/build.sh` pins it and
  Emscripten 6.0.11). The build is reproducible: two runs give the same
  `phreeqc.wasm` (sha256 `5903a017…`).
- **Carbonate, calcite, borate, water:** `database/phreeqc.dat`, the USGS
  file from that commit, unchanged. Calcite solubility is Plummer and
  Busenberg (1982).
- **Free chlorine and cyanuric acid:** `database/pool.dat`. phreeqc.dat has
  neither, so they are added from O'Brien, Morris and Butler (1974) as
  tabulated by Wojtowicz (2001), JSPSI 2(1), Table 2 (pK1 to pK13). The file's
  header lists every constant and how each `log_k` is built from them.
- **Liquid chlorine:** trade percent is grams of available chlorine per
  100 mL (Powell Fabrication & Manufacturing, *Sodium Hypochlorite General
  Information Handbook*).
- **Units:** US gallon, fluid ounce, pound and ounce by their exact
  definitions; molar masses from phreeqc.dat's own element weights.

## Limits

- The chlorine and cyanuric acid constants were measured at 24–25 °C and the
  source gives no temperature dependence, so they are used at 25 °C values
  at every temperature. Carbonate and calcite do follow temperature.
- ppm is taken as mg per kg of water and 1 L of pool water as 1 kg.
- When TDS is entered instead of salt, it is modeled as sodium chloride.
- Charge is balanced with sodium, or with chloride when there is too little
  sodium. The analysis says which.
- The saturation index is PHREEQC's calcite index, not the ANSI/APSP-11 LSI
  formula, so the two differ slightly (see the tests).

## Tests

`pnpm --filter @poolos/pool-chemistry test`

- **Parity:** 1,588 PHREEQC runs (433 waters and their doses) through the
  WebAssembly build and through a native gcc build of the same commit
  (`oracle/native.py`). They agree to PHREEQC's convergence tolerance, about
  1e-8; the test allows 1e-6.
- **Published values:** Wojtowicz's (2001) Table 4 of HOCl with cyanuric
  acid, 22 rows, within 2.5% (one printed value is a dropped zero, noted in
  the test). Wojtowicz's revised saturation index equation within 0.1 over
  324 waters.
- **Database:** the embedded copy matches the files, phreeqc.dat is
  byte-for-byte the USGS file, each `log_k` is the sum of the cited pK values,
  and the over-determined constants agree.
- **Behavior:** questions instead of guesses, every split adds up, doses land
  on their targets.

## Changing things

- Edited `database/*.dat`: run `pnpm --filter @poolos/pool-chemistry embed`.
- Changed how inputs are built: `GOLDEN_DUMP=1 pnpm vitest run test/parity.spec.ts`,
  then `python3 oracle/native.py build /tmp/phreeqc-native` (once) and
  `python3 oracle/native.py run /tmp/phreeqc-native`.
- New PHREEQC release: update the pins in `phreeqc/build.sh`, run it, and
  re-run the oracle.
