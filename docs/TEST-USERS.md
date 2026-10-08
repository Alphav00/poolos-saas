# Test users

Five logins for the test tenant `test-01` (Sample Pool Co.). Each one is a
person a PoolOS screen has to work for, with the checks that prove it does.
The seed file is [`tests/fixtures/test-users.json`](../tests/fixtures/test-users.json).

Three come from the PoolOS pitch:

> "Old Man Stevens gets big buttons and one green light. The tech-savvy kid
> gets automation and data. The pool guy gets everything. Same data
> underneath. Different face for everyone."

Two come from DESIGN.md: the seasonal new hire (the product thesis in
section 1) and the owner.

| Login | Role | Mode | Pool or route | Passes when |
|---|---|---|---|---|
| `stevens@poolos.test` | customer | simple | `oak-hollow` | Status reads from arm's length in sun · calling takes one tap · no chemistry words |
| `kid@poolos.test` | customer | technical | `aspen-drive` | Every reading shows its source · an alert rule fires once on test data · CSV export opens unchanged |
| `poolguy@poolos.test` | tech | full | Route B | A stop in under 60 s with one thumb (M3) · every dose names product and strength · a refresh mid-stop loses nothing |
| `newhire@poolos.test` | tech | guided | Route C, checked by `poolguy` | Every step says what to do with the kit · a dose over the ceiling waits for a senior · "ask a senior" works from any screen |
| `owner@poolos.test` | owner | dashboard | all of `test-01` | Every KPI shows its formula and record count (M12) · `test-01` can't read another tenant (M4) · a poor liner flag opens one quote (M9) |

## Rules

- Made-up people only. The fixture lint (`pnpm fixture-lint`) checks this
  file against `tests/denylist.txt`.
- Logins use the reserved `.test` domain (RFC 2606), so no message can reach
  a real inbox. Cloudflare Access can't sign these addresses in; API tests
  sign their own tokens for any email (`token()` in
  `apps/api/test/helpers.ts`, checked against the `ACCESS_JWKS` key set in
  `apps/api/vitest.config.mts`).
- `pool` values are ids from `apps/web/src/lib/field/sample.ts`.
- Modes (`simple`, `technical`, `full`, `guided`, `dashboard`) are a setting
  on the account, not separate apps. Nothing reads them yet: the API has no
  users table, and the owner is still set by `OWNER_EMAILS`.

## Not done here

- Nothing loads this file yet. Seeding it into D1 waits for the accounts
  and tenancy milestone (M4).
- The screens for each mode are designs only, on the "PoolOS Design" canvas.
