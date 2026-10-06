# Reference material, not product code

`diving-board-phase1/` is the work from Alphav00/the-diving-board PR #1
(closed unmerged, 2026-10-06), copied here so it isn't lost. It is **not**
built, linted, typechecked or tested with PoolOS, and nothing in `apps/` may
import from it.

It was hand-rolled before DESIGN.md existed, so under constraint 2 none of it
enters the product without Chi's OK. Before any of it is used:

- **Measuring math** (`packages/measure-core`): a TypeScript port of Liner
  Measure Pro. It needs the ownership question settled first (DESIGN.md
  section 12, risk 1) and Chi's OK for the port (section 5.3).
- **Supplier ordering** (`packages/orders`): order lifecycle, PDF and email
  builder. This is module D material for M11.
- **API** (`apps/api`): includes a custom Cloudflare Access JWT check.
  Section 5.5 says auth is bought, not built, so it must not be reused as is.
- **Research** (`docs/RESEARCH.md`, `docs/DESIGN-RULES.md`): failure modes
  of Skimmer, Pool Brain, Orenda, Pool Math and equipment apps, with
  sources, and how liner and cover manufacturers take orders. Free to use.

Its own tests still pass from inside that folder:
`cd reference/diving-board-phase1 && pnpm install && pnpm test`
(398 tests at the time of copying).
