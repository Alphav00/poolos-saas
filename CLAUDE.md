# PoolOS: working rules for coding agents

Read before writing code:
- [`docs/DESIGN.md`](docs/DESIGN.md) §3 (hard constraints) and §14.1 (dated corrections)
- [`docs/DECISIONS.md`](docs/DECISIONS.md): log each new decision in its format (options, choice, why, evidence, falsifier)
- [`brands/README.md`](brands/README.md)

Before every push, `pnpm check` must pass: lint, typecheck, fixture lint, all tests.

## Stack (checked, not assumed)

| Part | What it is | Notes |
|---|---|---|
| `apps/web` | Svelte 5 (runes), TypeScript, Vite | The phone app. Screens are `src/lib/app/*.svelte`, routed by hash in `src/App.svelte`. Data modules are `src/lib/field/*.ts`. |
| `apps/measure` | Svelte 4, JavaScript, Tailwind 3, `svelte-routing` | Liner and cover measuring wizard, served at `/measure`. Keep it Svelte 4; don't migrate it as part of feature work. |
| `apps/api` | Cloudflare Worker, TypeScript | Checks Cloudflare Access on every request (`src/auth.ts`). Data lives in D1 (`board_docs`, `measure_jobs`). No KV or Durable Objects. |
| `packages/*` | `pool-chemistry` (PHREEQC in WebAssembly), `measure-core` | Held to goldens. Chemistry numbers come only from the engine. |
| `brands/<id>/` | Name, logo, colours per company | Picked at build with `BRAND=<id>`. |

## Web app (`apps/web`)
- Svelte 5 syntax: `$state`, `$derived`, `$props`, `onclick={...}`. Never `on:click`, and no store libraries.
- Load async data into empty `$state` from a function. Don't put a Promise in `$state` (see `Report.svelte` `loadReports`).
- Style with the classes in `src/lib/app/app.css` (`.card`, `.btn`, `.chip`, `.stop`...). Colours come from `--brand-*` variables; never hard-code a brand hex.
- Design for phone first: one thumb, 44 px tap targets, readable in sun, 16 px+ inputs.
- In SVG, set brand colours with `style:fill` / `style:stroke`, not attributes.

## API (`apps/api`)
- Store app data through the boards API (`src/boards.ts`, `/api/boards/:board/:collection/:id`).
  - Give each collection a shape check (pattern: `src/field.ts`, `src/feedback.ts`).
  - Stamp who and when on the server, never from the form (pattern: `stampFeedback`).
- A new endpoint, binding or table needs Chi's OK first (DESIGN.md §3 #2).
- Every phone write goes through the Worker (§3 #12).
- After any change to `wrangler.jsonc`, run `pnpm exec wrangler types` and commit the result.

## Data
- Use made-up names, pools and addresses only.
- Tests and fixtures never name a real company, customer or address. `tests/denylist.txt` is enforced by `pnpm fixture-lint`.
- Demo records carry `demo: true` and show the DEMO badge.

## Tests
- Web: Vitest, next to the code (`*.test.ts`).
- API: Vitest in the Workers pool, `apps/api/test/*.spec.ts`. Use `call()` / `token()` from `test/helpers.ts`.
- Measure: plain Node scripts in `apps/measure/tests/`.

## Deploy
- Merging to `main` deploys poolos.pathofphi.com (`.github/workflows/deploy.yml`, `BRAND=ccs-pools`).
- A pull request deploys poolos-preview.pathofphi.com with its own D1 database (`.github/workflows/preview.yml`). See `docs/DEPLOY.md`.

## Commits and PRs
- One feature per PR. Keep diffs to what the feature needs.
- Don't commit model names or credentials.
