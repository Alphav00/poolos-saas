# Agents

Instructions for Jules and any other coding agent working in this repo.

- **Writing code:** read [`CLAUDE.md`](CLAUDE.md) first. It holds the stack,
  the coding rules and the hard constraints (no real company or customer data
  anywhere, every phone write through the Worker, `pnpm check` before every
  push).
- **User testing and review:** read [`testing/README.md`](testing/README.md),
  then pick a persona from [`testing/personas/`](testing/personas/).
- **Scheduled review:** walk each persona's journeys (with `pnpm e2e` once it
  lands, or the latest "user-journeys" workflow artifacts), judge them with
  that persona's eyes, and file what you find as the brief says: one report
  at `testing/reports/<yyyy-mm-dd>-<persona>.md` in a PR, or one GitHub issue
  per finding labelled `user-testing`.
- Never test against production (poolos.pathofphi.com). A review PR changes
  no app code.
