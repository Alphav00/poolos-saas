# inputs/

Drop files here for M1. This folder is git-ignored apart from this README,
so raw files (which may still carry CCS names) never get committed.

Needed for M1 (DESIGN.md section 11). The chemistry engine is now PHREEQC
(packages/pool-chemistry), so pool_chemistry.py is optional: bring it only for
the parts that are not equilibrium chemistry (salt-cell ranges, products).
- `pool_chemistry.py`
- `design.md` (from bld: `designer/runs/v0-2/design.md`)
