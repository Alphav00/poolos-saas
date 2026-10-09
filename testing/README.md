# User testing brief for AI reviewers

For Jules or any coding agent asked to test and review PoolOS as its users
would. Coding rules are in [`CLAUDE.md`](../CLAUDE.md); this brief is only
about testing and reporting.

## What the app is

PoolOS is a phone app for pool service companies. A tech on a route opens a
pool, enters the day's water readings from a plain drop or strip test kit,
and gets back what to add: amounts by the company's own product and its label
strength, worked out by a real chemistry engine (USGS PHREEQC). Around that
loop sit a Today screen (weather, route, crew), a Measure tool for liners and
covers, a message board and an in-app problem report. The thesis
([`docs/DESIGN.md`](../docs/DESIGN.md) §1): a seasonal hire with a phone, a
plain test kit and the right app can service pools competently. It is built
for one thumb, wet hands and direct sun. All pools and crew are made-up demo
data marked **DEMO**.

## How to run it

- **Local, real Worker (coming):** `pnpm install`, then `pnpm e2e`. It starts
  the real Worker with a local D1 database, walks the journeys and writes
  screenshots and a report to `e2e-output/`. Until it lands, `pnpm install`
  and `pnpm check` (lint, typecheck, fixture lint, unit tests) are what run.
- **CI artifacts (coming):** the "user-journeys" GitHub Actions workflow
  uploads the same screenshots and report. Read the latest run's artifacts if
  you cannot run a browser.
- **Never test against production** (poolos.pathofphi.com): it is a real
  company's test drive. The pull-request preview (poolos-preview.pathofphi.com,
  see [`docs/DEPLOY.md`](../docs/DEPLOY.md)) sits behind Cloudflare Access, so
  an agent without an Access login cannot reach it. Use the local run or the
  artifacts.

## What to do

1. Pick one persona from [`personas/`](personas/):

   | File | Who | Login (`tests/fixtures/test-users.json`) |
   |---|---|---|
   | [`owner.md`](personas/owner.md) | Owner operator, dashboard mode | `owner@poolos.test` |
   | [`dispatcher.md`](personas/dispatcher.md) | Office: reviews the day, assigns, reads reports | none yet (role coming) |
   | [`lead-tech.md`](personas/lead-tech.md) | "The pool guy", full mode, Route B, Lead | `poolguy@poolos.test` |
   | [`new-hire.md`](personas/new-hire.md) | Seasonal hire, guided mode, Technician | `newhire@poolos.test` |
   | [`customer-simple.md`](personas/customer-simple.md) | Old Man Stevens, big buttons | `stevens@poolos.test` |
   | [`customer-technical.md`](personas/customer-technical.md) | The kid, data and CSV | `kid@poolos.test` |

2. Walk each journey in that file, step by step, and compare what happens
   with the **Expected** line. Steps marked *coming* or *expectation* are for
   features not built yet: check whether they have landed; if not, skip them
   (they are not bugs).
3. Judge with that persona's eyes, not a developer's:
   - **Sun, wet hands, one thumb.** Text readable in direct sun, tap targets
     at least 44 px, inputs 16 px or more, nothing that needs two hands.
   - **Words.** Would a seasonal hire in their first week understand every
     label and message? Jargon ("TA", "CYA", "LSI", "401") with no plain
     explanation is a finding.
   - **Doses.** Every dose names the product and its strength, and shows the
     target it aims at. A dose with no product or strength is a **Major**.
   - **Numbers.** No invented numbers: when readings are missing, the app
     asks for them rather than guessing.
   - **Nothing lost.** Back, reload, rotate, offline: anything typed survives
     until saved.
4. Check each "Breaks if" line in the persona file.
5. Report (below). "Walked journey 2, all fine" is worth one line in a run
   report, so we know it was looked at.

## How to report

Choose one of two ways. Both use the fields of the in-app
**More → Report a problem** form (see
[`docs/TEST-DAY.md`](../docs/TEST-DAY.md)), so findings from people and agents
read the same.

- **A run report:** one markdown file per run at
  `testing/reports/<yyyy-mm-dd>-<persona>.md` (e.g.
  `testing/reports/2026-10-12-new-hire.md`), opened as a pull request that
  adds only that file.
- **GitHub issues:** one issue per finding, labelled `user-testing`, titled
  `[<Feature area>] <In a few words>`.

| Field | Values |
|---|---|
| Feature area | Dispatch · Route View · Tech Field Portal · Chemical Logger · Measure · Invoicing · Other |
| Severity | Blocker (stops the work) · Major (wrong result or a hard workaround) · Minor (annoying, has a workaround) · Idea |
| Device | phone · tablet · desktop (and the viewport, e.g. 390×844) |
| What happened | required: what you saw, with the exact words on screen |
| What you expected | what the persona file or common sense says should happen |
| Steps | the taps, in order, from a named screen |

Also give the persona, the journey number, the HEP id if the journey lists
one, the commit you tested (`git rev-parse --short HEAD`), and a screenshot
path from `e2e-output/` when you have one.

### Report template

```markdown
# User test: <persona> · <yyyy-mm-dd>

Commit: <short sha> · Run: <pnpm e2e | user-journeys run URL> · Viewport: <w×h>

## Journeys walked

| Journey | HEP | Result |
|---|---|---|
| 1. <name> | HEP-10 | ok / finding 1 / skipped (coming) |

## Findings

### 1. <In a few words, 120 characters at most>

- Feature area: <Dispatch | Route View | Tech Field Portal | Chemical Logger | Measure | Invoicing | Other>
- Severity: <Blocker | Major | Minor | Idea>
- Device: <phone | tablet | desktop>
- Persona and journey: <persona>, journey <n>, step <n>
- What happened: <what you saw; exact on-screen words>
- What you expected: <expected result>
- Steps:
  1. <screen> → <tap>
  2. ...
- Screenshot: <e2e-output/...png, if any>
```

## Rules

- **Made-up people and places only.** No real company, customer, person or
  address in a report, issue or screenshot (DESIGN.md §3 #1; the strings in
  `tests/denylist.txt` must never appear). Use the demo pools and the
  `@poolos.test` logins.
- **Do not change app code in a review PR.** A review PR adds one file under
  `testing/reports/` and nothing else. Fixes are separate PRs that follow
  `CLAUDE.md`.
- **One finding per issue.** Two problems on one screen are two issues.
- **Do not file through the in-app form against production** or any deployed
  site; use the local run.
- No credentials in reports, issues or logs.
