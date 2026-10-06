# Design rules

These are the requirements drawn from [RESEARCH.md](RESEARCH.md). A rule is
ticked only when code enforces it and a test proves it.

## Data and sync
- [x] Every editable record has a version. A stale write returns 409 with the current copy, never a silent overwrite (`apps/api`: customers, jobs).
- [x] Clients can mint record ids offline, so a retried create returns the same record instead of a duplicate (`POST /api/jobs`).
- [x] Order history is append-only, enforced by database triggers (`order_events`).
- [ ] Offline-first field app with a queued sync and visible sync state (the queue from Liner Measure Pro, `saveQueue.js`, is to be ported).
- [ ] Full export (CSV/JSON plus photos) on every plan.

## Measuring and ordering
- [x] The server recomputes the closure checks from the measurement and ignores any result the client sends. A job with a failing (blocking) check cannot go to review, and its order cannot be marked ready.
- [x] Every measured value on an order (dimensions, A/B readings, wall heights, fittings, obstacles, closure results) is copied from the saved job. A request that tries to set one is refused, so an order never carries numbers that differ from the measurement.
- [x] Readings that are not numbers are refused before any math runs, instead of being computed as NaN.
- [x] Each submission stores the exact PDF that was sent.
- [x] Developed (slope) length is used for floor panels, never plan length (`measure-core`).
- [x] Supplier contact details are never guessed. Built-in suppliers ship unverified, and each installer enters the details from their own dealer account.
- [x] Every order has a stable reference in its subject line so supplier replies can be matched to it.
- [x] Orders that miss their acknowledgement deadline are flagged.

## Chemistry (phase 3)
- [ ] Name the formula and version on every result (LSI/CSI). Show the PHTA chart value next to the full calculation.
- [ ] Chlorine targets scale with CYA.
- [ ] Doses use the strength of the actual product (e.g. 10% vs 12.5% liquid chlorine, cal-hypo %).
- [ ] Volume carries how it was obtained (measured, calculated or estimated) and its unit. *(The schema column exists; the UI does not yet.)*
- [ ] Record how each reading was taken and how confident it is. Ask for a retest when a value is implausible.
- [ ] Doses above a ceiling need confirmation, and the math is shown.

## Service and business (phase 4)
- [ ] Route stop order is stored data. Moves keep it, and bulk changes have a preview and undo.
- [ ] GPS check against the site at the start of each stop.
- [ ] Ledger with running balances. Payments reconcile before any late notice goes out.
- [ ] Equipment integrations are read-only and allowed to be unavailable.
