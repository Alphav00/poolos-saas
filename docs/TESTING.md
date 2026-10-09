# Testing PoolOS

Two testers, two halves of the app, at poolos.pathofphi.com (sign in through
Cloudflare Access with the address Chi added). Everything on the route is
**sample data**: made-up pools, made-up readings history, a made-up company
policy. Nothing you enter reaches a real customer.

## How to report

One message per thing, in this shape:

1. **Screen** — the title at the top (e.g. "Maple Court", "Today's readings",
   "Kidney Test").
2. **What you did** — the taps, in order.
3. **What you expected.**
4. **What happened** — a screenshot if you can; the exact words of any
   message on the screen.
5. **Phone and where** — model, portrait/landscape, indoors or in sun.

Hard-to-read in sun, too small for a thumb, lost what you typed, a number that
looks wrong: all of those count. "Looks fine" on a screen is also worth
sending once, so we know it was looked at.

## Tester 1 — maintenance (route, readings, doses)

Start on **Today**, then the **Route** tab.

1. **Chemistry setup, once.** More → Chemistry setup → "Load the sample
   setup" → Save. This gives the sample company its products (with label
   strengths) and target ranges. Every dose on the route names which of
   these it used. Without it the pool screens say "Set up chemistry".
2. **A stop.** Route → Maple Court → "Enter today's readings". Tap each
   reading, use the wheel or type it, Done, Save. Then on the pool screen:
   - *Water · PHREEQC*: saturation index, carbonate alkalinity, HOCl.
   - *Add now*: amounts by product and strength, with the target under each.
   - Report anything you would not trust, and say why.
3. **Leave some out.** Save readings with only FC and pH. The pool screen
   should list what the engine still needs, and show no acid amount. It
   should never guess.
4. **Interrupt yourself.** Half-way through entering readings, go back,
   open another pool, come back; kill the app and reopen; turn the phone.
   Nothing typed should be lost until you save or clear it.
5. **Salt pools.** Cedar Ridge and Aspen Drive have a real cell (Hayward
   T-CELL-15, Pentair IC40): a low salt reading should give an amount aimed
   at the manufacturer's figure and name the manual. Maple Court's cell is
   made up: it should ask which cell it is, not give a number.
6. **Timing.** Time one full stop (open pool → readings saved → doses on
   screen) with one thumb. The target is under 60 seconds.
7. **Outdoors.** Read the pool screen in direct sun. Photo it.

Not built yet, so not a bug: the route order and the stop list are fixed
sample data; there is no "log what I added" step; no customer note goes
anywhere; no sign-in roles (everyone is a tech; the owner sees extra boards).

## Tester 2 — Measure (liners and covers)

Start at More → **Measure**, or poolos.pathofphi.com/measure.

1. **Sample jobs.** Jobs → Load fixtures → load *kidney*, *freeform*,
   *rectangular*, *kidney-liner*, *rectangular-liner*. Open each: the 3D
   model should look like its name (the kidney has two lobes and a waist;
   the freeform is a lagoon). Dimensions tab: do the numbers make sense for
   the shape?
2. **PDFs.** On a cover job, PDF → cover order form. On a liner job (*-liner*),
   both forms. Do they open on the phone? Anything cut off or empty?
3. **A new job.** + New, work through the wizard. Enter a real pool from
   memory if you have one, or invent a 30 × 15 rectangle: A/B line 20 ft,
   points every few feet. Watch the closure card: close / warn / block
   should make sense as you fix points.
4. **Feet and inches.** Type distances as 12'6", 12.5, 12 6, 150in: they
   should all read back the same. Report any that are refused or misread.
5. **Autosave.** Leave the wizard half-done, reopen the app: it should be
   where you left it.
6. **Swap A/B.** On a job, Swap A/B; the shape should mirror, not break.

Not built yet: obstacles in the 3D model, supplier-specific order formats,
more than one user on a job.

## Where the numbers come from

Doses and the saturation index come from USGS PHREEQC running inside the
app (`packages/pool-chemistry`); targets are the sample company's own policy
and say so under every dose; salt targets by cell come from the maker's
manual, cited in `packages/pool-chemistry/src/saltCells.ts`. Measure's
geometry is held to the original Liner Measure Pro by 1,000+ golden tests.

## Run the user journeys locally / in CI

Scripted walks through the phone app, as an owner and as a tech, against the
real Worker running on your machine. They are for catching a screen that no
longer works before a tester (or an AI reviewer) finds it.

```sh
pnpm e2e                 # all journeys
pnpm e2e owner-day       # just one (ids are in scripts/e2e/journeys/*.mjs)
E2E_SKIP_BUILD=1 pnpm e2e   # reuse the last build (same BRAND; pnpm test rebuilds with the default brand)
```

What it does (`scripts/e2e/run.mjs`):

1. `BRAND=ccs-pools pnpm build` (set `BRAND` for another brand).
2. Makes a throwaway RS256 key and writes its public half to
   `apps/api/.dev.vars` (`scripts/e2e/dev-auth.mjs`). The Worker checks the
   Access token exactly as in production, against this key instead of
   Cloudflare's: the same `ACCESS_JWKS` path the API tests use, no bypass.
   `.dev.vars` is read only by `wrangler dev`, never deployed, and gitignored.
   The kit refuses to overwrite a `.dev.vars` it did not write, and deletes
   its own when the run ends (the API tests read `.dev.vars` too, and would
   fail against the local issuer).
3. Applies the D1 migrations to a fresh local database
   (`apps/api/.wrangler/e2e-state`, wiped each run).
4. Starts `wrangler dev --local` on 127.0.0.1:8787 and checks that a request
   with no token still gets 401.
5. Opens Chromium at 390×844, 2× (a phone), signed in as each journey's
   persona (`owner@example.test`, `tech@example.test`; the owner list is
   `owner@example.test` only).
6. Runs each journey, owner first, screenshotting every step.

Nothing touches production: local key, local D1, local R2, no Cloudflare
account or secrets.

**Results** land in `e2e-output/` (gitignored):

- `report.md`: each journey, each step pass/FAIL with time and screenshot
  link, then any console errors and HTTP 4xx/5xx the page saw (some 4xx are by
  design, e.g. the made-up salt cell on Maple Court).
- `<journey>/<nn>-<step>.png`: a full-screen screenshot after every step,
  failed ones included.
- `wrangler.log`: the Worker's output.

The command exits non-zero if any step fails. A failed step ends its journey;
the next journey still runs.

**Chromium.** Uses `CHROMIUM_PATH` if set, else `/opt/pw-browsers/chromium`
if present, else playwright-core's own install:
`pnpm exec playwright-core install chromium`. `E2E_HEADED=1` shows the window.

**In CI**, `.github/workflows/user-journeys.yml` runs on every pull request,
weekly (Monday 06:17 UTC) and by hand (Actions → User journeys → Run
workflow). The report is on the run's summary page, and the screenshots are
in the `user-journeys` artifact at the bottom of it (kept 14 days).

**Adding a journey.** A file in `scripts/e2e/journeys/` exporting
`{ id, order, persona: { email, label }, async run(page, step, { brand }) }`.
Wrap each user action in `await step('What the user does', async () => …)`.
Find things by visible text or role (`page.getByRole('button', { name: 'Send report' })`),
not CSS, and wait for what the user would wait for (`visible()` in
`scripts/e2e/expect.mjs`). Use made-up `@example.test` addresses only.
