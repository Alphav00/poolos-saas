# @poolos/measure-core

Liner and cover measuring for PoolOS: A/B reconstruction, liner closure checks
and material takeoff, job validation, and both order forms (JSON and PDF).

It is a TypeScript port of Liner Measure Pro's Python backend
(`Alphav00/liner-measure-pro`, `backend/app`), so it can run inside the PoolOS
Worker. The port is held to the original, not just to its own tests:

- `oracle/generate.py` runs the original backend (Python 3.11, the version it
  deploys on) over the five built-in pools plus ~110 variants and seeded
  random pools, and records every endpoint result, the validation outcome of
  ~50 request bodies, and the exact ReportLab page flow of both order forms.
- `test/parity.test.ts` and `test/validation.test.ts` require the TypeScript
  to reproduce all of it exactly: every number as the same string, every
  message, every PDF table cell, column width and style.

Python's number handling is reproduced where it shows (`src/pynum.ts`): float
repr, `round()` and `format()` with ties to even, `Decimal` strings, and
CPython's `math.hypot`.

To regenerate the goldens after a deliberate change to the original:

    LMP_BACKEND=../liner-measure-pro/backend python3.11 packages/measure-core/oracle/generate.py
