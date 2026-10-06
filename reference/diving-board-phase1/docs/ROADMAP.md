# Roadmap

The first users are liner and cover installers. Each phase ships something
they can use before the next one starts.

## Phase 1: Measuring and ordering core (this PR)
- Monorepo on Cloudflare: Workers + D1 + R2, TypeScript, pnpm workspaces.
- `measure-core`: the A/B reconstruction, liner math, closure checks and
  takeoff, ported from Liner Measure Pro with all of its tests.
- `orders`: supplier registry (Latham, Merlin, Loop-Loc, Garrett, and
  suppliers you add yourself), order lifecycle with an audit trail,
  pre-submission checks, PDF order form, submission email,
  acknowledgement-deadline flags.
- API: organisations and roles, customers, sites, pools, measuring jobs with
  server-side closure checks, orders, and history.

## Phase 2: Field app
- Port the Svelte measuring wizard from Liner Measure Pro onto this API.
- Offline-first: a local store plus the save queue, with visible sync state.
- Photo capture with background upload to R2.
- Supplier-specific form layouts, filled in from each manufacturer's current
  form once the installer provides it.
- Sending email through the installer's own domain, and matching replies to
  orders by reference.

## Phase 3: Chemistry
- `packages/chem`: CYA-scaled chlorine targets, LSI/CSI with the formula named,
  dosing by real product strength, volume calculator with units, retest
  prompts for implausible readings. Every rule in DESIGN-RULES.md under
  Chemistry, with tests built from worked cases checked against published
  references.

## Phase 4: Service operations
- Customers' service schedules, routes with stored stop order, GPS check-in,
  readings and doses at each stop, invoices with a ledger, QuickBooks sync.

## Phase 5: Homeowner app
- The PoolOS design, served from the same data: pool status, readings, next
  visit, messages, and order status for their new liner or cover.

## Manufacturer connections
No liner or cover manufacturer publishes an ordering API (see RESEARCH.md),
so orders go out as PDF by email or as an upload package for dealer portals,
and are tracked here. When a manufacturer offers an API or EDI, it is added
as another channel in `packages/orders` without changing jobs or orders.
