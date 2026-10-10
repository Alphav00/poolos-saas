# PoolOS SaaS — Development Design Document v0.1

| | |
|---|---|
| Owner | Chi (her own product; not CCS Pools) |
| Date | 2026-10-06 |
| Status | DRAFT for agent suggestions, then handover to Claude Code |
| Use | Read top to bottom before writing code. Sections 10 and 11 are the work queue. |
| Change rule | Append only. Nothing in this document is deleted or rewritten; corrections are added as dated lines in section 14. |

**Line labels used throughout**

- `DECIDED` — Chi said it. Her words are quoted where they exist.
- `EXISTS` — a built asset or verified fact, with where it lives.
- `PROPOSED` — Claude's design choice. Not approved. Chi or an agent may overrule it.
- `OPEN` — needs an answer before the dependent work starts.
- `UNVERIFIED` — repeated from a source that was not re-checked today.

---

## 1. What this is

One software product that covers everything a pool company does: weekly service routes, water chemistry, measuring liners and covers, ordering custom goods, finding and closing work, billing, equipment and warranty, crew, and the numbers that tell an owner whether the business is healthy.

- `DECIDED` 2026-10-06: "I wanna make a full saas surface for all swimming pool needs.. Use the agent Pipeline"
- `DECIDED` owner: Chi's own product ("Mine"), not CCS Pools.
- `DECIDED` first module: "I want a skimmer replacement app first".
- `DECIDED` umbrella: "PoolOS is the umbrella; the Diving Board becomes a column or label".
- `OPEN` public product name. PoolOS is the umbrella name for the system; whether it is also the name customers see is not decided. The Producer proposed three names for the route module: Stop Sheet, Wet Thumb, Deck Log.

**Why it should exist (Chi's field complaints, verbatim)**

- "Skimmer doesn't even show you what chemicals to put in unless you have a special tool or buy an expensive meter. There's gotta be better ways"
- "the UI is skimmer is atrocious. Definitely not made by a field tech or someone who ever had wet hands."

**Product thesis** (`EXISTS`, PoolboiDB thesis confirmed by Chi 2026-08): an under-qualified seasonal hire with a phone, a plain test kit and the right app can service pools competently, with a senior tech rotating for quality checks. The software carries the expertise.

---

## 2. Who pays, and what the market looks like

| Fact | Value | Source |
|---|---|---|
| Professionally serviced US pools | about 3.1M of about 5.5M in-ground | Pool Corp and Leslie's FY2025 10-Ks (R9) |
| Largest operator's share | about 1.3% (fragmented) | PR Newswire 2026-01-23 (R9) |
| Sole operators | about 87% of firms in the NAICS code | Census Nonemployer Statistics 2022 (R9) |
| Operators on all-in-one software | 64%; 5% use none | Skimmer 2025 survey (R9) |
| Billing | 76% monthly | Skimmer 2026 survey (R9) |
| Buy parts and chemicals in person | 78–79% | Skimmer 2025 and 2026 (R9) |
| Seasonality, peak ÷ trough | NJ 2.35 · US 1.28 · FL/AZ/CA 1.04 | BLS QCEW 2024, derived (R9) |
| Skimmer | $1/pool/month (min $49, up to 49 pools); $2/pool/month (min $98) | pooldial.com/compare, a competitor's page (R28) |
| Skimmer dosing | LSI calculator by Orenda, on the $2 tier only | Skimmer product update 475 (R28) |
| PoolDial | $2/pool/month, $40 minimum; markets an AI phone receptionist | pooldial.com, checked 2026-10-06 |
| Pool Brain | about $55/tech/month + $10/admin seat | third-party pages; `UNVERIFIED` at the vendor |

- `DECIDED` first payer: pool service companies (route operators).
- `PROPOSED` price for the route module: $1 per pool per month with dosing included. `OPEN` — this is Gate 1 call 2.
- Seasonality note: a product sold only in NJ sells half the year. Sun Belt operators have no off-season.

**What is and is not a differentiator** (corrected 2026-10-06)

| Claim | Status |
|---|---|
| Dosing included at the base price | Real. Skimmer gates it behind $2. |
| Acid dose from an acid-demand drop test | Real, as far as checked. |
| Salt target per cell manufacturer | Real, as far as checked. |
| Wet-hands, one-thumb, sunlight UI | Real only if proven on a phone outdoors. Not yet tested. |
| Customer-readable service note | Not a differentiator. Skimmer already emails readings, dosages and photos. Table stakes. |
| Product and strength named in dosing | `OPEN` — not checked whether Skimmer or PoolDial already do this. |

**The structural gap** (`EXISTS`, R9): the four numbers operators say they run on — stops per day, route density, churn, repair margin — have no published benchmark and are not captured by any system of record. No vendor records drive time, arrival time, churn reason, or truck-level chemical drawdown. A product that captures them owns data nobody else has.

---

## 3. Hard constraints

These apply to every module and every agent.

1. `DECIDED` No CCS Pools names, logos, customers, addresses, prices or service history in any input, fixture, test or screenshot.
2. `DECIDED` "No hand rolling without permission." Prefer existing code and official components. Custom code, scripts, pipes or APIs need Chi's OK first.
3. `DECIDED` Runs on Chi's stack: Cloudflare Workers + D1 + R2, or Docker on bld-golden.
4. `DECIDED` Phone-first: one hand, readable in direct sun, usable with wet hands.
5. `DECIDED` Readings come from a plain drop or strip test kit. No meter or device required.
6. Chemistry numbers come only from the cited engine (section 6). Never invented.
7. Every limit names its source and jurisdiction. NJ public pools (N.J.A.C. 8:26: pH 7.2–7.8, combined chlorine ≤ 0.2, CYA ≤ 100) differ from CDC MAHC. 8:26 covers public pools, not residential ones.
8. Dosing names the product and its strength. "12.5% liquid chlorine" means trade % or weight %, about 13% apart; say which.
9. Acid dose cannot be computed from pH alone. Take an acid-demand reading, or show no acid amount.
10. Salt targets are manufacturer-specific. Never one universal number.
11. Cyanuric acid limits are contested (ratio camp vs fixed-range camp). Do not hard-code one limit; show which rule is in force.
12. A phone cannot write to D1 directly. All writes go through a Worker.
13. Credentials never appear in code, chat, logs or board cards.

---

## 4. Module map — every idea on record

Each module lists what exists, what was asked for, and what is missing. Order here is not build order; see section 10.

### A. Route and Stop (the Skimmer replacement) — FIRST
- The loop: day's route → arrive → enter readings → see what to add and how much → log what was added → leave a note the customer can read.
- `EXISTS` Gate 1 design for the first slice: Silas's verdict BUILDABLE, 10 acceptance criteria, `designer/runs/v0-2/design.md` on bld (sha256 begins `65bc21ae`). Three criteria have exact outputs: 61.4 fl oz of 12.5% trade-% liquid chlorine; 91.7 fl oz of 31.45% muriatic acid; LSI −0.22 on the ANSI/APSP-11 TDS basis.
- `OPEN` Gate 1 is unanswered: go/no-go, price, name, online-only for slice 1, minimum readings per stop.
- Later: route ordering, rain-day protocol, recurring schedules, skipped-stop reasons, checklists per stop, before/after photos.
- `EXISTS` pattern source: a route atlas document (yard, per-town patterns, sequencing heuristics, rain-day protocol). CCS-specific content stays out; the structure is reusable.

### B. Chemistry engine
- `EXISTS` `pool_chemistry.py` (about 93 KB): LSI with cited factor tables, TDS ladders, CYA correction to alkalinity, dose formulas, manufacturer salt ranges (research R14, R15). Its header reads "author: Chi (CCS Pools)" and its defaults are CCS equipment — both must be cleaned before it enters this repo.
- `EXISTS` `chem_path_dspy_program.py` v1.1.0, 13/13 tests: a chemistry forecasting engine (where a pool's water is heading).
- `EXISTS` per-pool playbook dataset shape: status + trend + risk score per pool. Shape reusable; data is not.
- `EXISTS` analysis: high CYA does not raise weekly chlorine use much; it raises shock cost (target FC scales with CYA). Partial drain can pay back in one season. Build this as a fleet cost calculator.
- Ideas on record: chem alerts (CYA ≥ 100, FC = 0) pushed weekly; "worst pool right now" list; green-to-clean protocol; seasonal protocols; equipment search.
- Do not reuse: the LSI function in the Pool Service Pro / PoolboiDB prototypes. Its temperature table and calcium term are made up.

### C. Measure (Liner Measure Pro)
- `EXISTS` repo `Alphav00/liner-measure-pro`: shipped MVP. Svelte 4 + Vite + Tailwind + Three.js front end; Python 3.11 + FastAPI + SQLAlchemy + ReportLab back end; SQLite. A-B two-circle reconstruction, 3D model, PDF order forms for cover and liner from one walk, 8-step wizard, 21 standard shapes + 7 organic, three closure checks with close/warn/block bands, about 700 tests.
- `EXISTS` UI assessment (R29): closure card is the best screen; 10 findings; SPA-fallback fix merged. Not tested: sunlight legibility, real phone.
- `DECIDED` exposure: measure.pathofphi.com, host port 28100 on 127.0.0.1, behind Cloudflare Access; boss and techs get access. Emails not yet supplied.
- Missing: multi-user, obstacles in 3D, supplier-specific order formats (Merlin-format liner order was the target), real-phone QA.
- `OPEN` see section 12, risk 1 (who owns this code).

### D. Order and fabrication — the repo model
- `EXISTS` concept (pasted by Chi 2026-10-06): the pool is a repository, the dealer is the developer, cut files are code.
  - Every measurement change is a commit with author and time. Mistakes are reverted, not re-ordered by phone.
  - Factory CAD review is a branch. A discrepancy comes back to the dealer as a pull request with a visual diff.
  - A pre-commit check runs the closure math in the field, so bad measurements never reach the factory queue.
  - Merge to main triggers the build (coordinates → CNC/CAM nesting). Shipping is a release tag.
- Missing: a manufacturer that accepts the format. Concept only.
- Shared A-B core serves C and D.

### E. Leads and sales
- `EXISTS` research verdict (R17/R18): buy pool-owner lists (about $0.025 per record) rather than build aerial detection (about 30% error in the largest deployment). `UNVERIFIED` today.
- `EXISTS` liner lead kit: find → verify → contact → quote → subcontract model; lead tiers; quote template; direct mail letter; sales script; lead CSV template; pool-scanner prompt and script.
- Ideas from the consultant review (R12), all cheap and all product features:
  - One field on every service ticket: "liner condition: good / fair / poor" — then quote the poors. Attach rate is a sales gap, not a marketing gap.
  - Same-street referral credit.
  - Speed to lead: answer the enquiry while the tech is on route.
  - One intake field: "How did you hear about us?"
  - Same-day SMS review ask after every visit.
  - Publish prices for scoped jobs only; never the weekly route rate.
- `EXISTS` pricing notes: "How to price Pool Jobs", estimating method to be documented by Chi.

### F. Customer communication
- Service note after each visit (table stakes), review request, seasonal reminders (opening, closing), customer portal.
- `EXISTS` designed-but-unbuilt customer experience map in the brand document (post-service follow-up → review request → seasonal reminder). Structure reusable.

### G. Billing and money
- Monthly billing (76% of operators). Chemical billing three ways: included 45%, itemized 30%, hybrid 25% — the product must support all three.
- Twelve-month billing on annual contracts (R12): smooths a 2.35 peak-to-trough, funds off-season tech retention, cuts churn.
- Accounting sync. The trade is a QuickBooks monoculture; Skimmer syncs only paid invoices, one way — a known pain.
- Receipt capture: because most operators buy at a counter, a photo of the receipt attached to a job or truck is the only way material cost gets joined to work.

### H. Equipment, RMA and warranty, distributor ordering
- `EXISTS` Chi's background: ran a liner department solo, about 300 jobs a year, owned RMA and distributor relationships end to end. The process template is in her head, not in a file. `OPEN` — needs writing down.
- Installed equipment per pool with age, history, warranty; filter clean triggered by pressure rise over clean baseline, not by calendar.
- Failure-mode taxonomy by equipment class exists in R9 §8.9.

### I. Business intelligence
- Capture what nobody captures: arrival and departure time per stop, drive time between stops, coded cancellation reason, callback flag linking a return visit to the visit that caused it, pool attributes that drive chemical demand (surface, sanitizer system, sun, enclosure), weather joined to visits, truck-level chemical drawdown.
- Dashboard that joins chemistry, time and route — the "no real dashboard" gap named in the Business OS skeleton.
- KPIs with a defined formula: revenue per stop, chemical cost as % of revenue, stops per day per tech, payroll as % of sales, seasonal ratio. Route density has no agreed definition — the product must pick one and state it.

### J. Crew layer
- `EXISTS` patterns from the crew Discord tool roadmap: tech cards, leaderboard, achievements detected from data, weekly stat polls, a heartbeat that makes a dead cron visible, one writer of truth for counts. Rule from that roadmap: fix the data first, then make it interactive.
- `EXISTS` time tracking pattern (Chronos Tracker, a Cloudflare Workers PWA).
- `DECIDED` 2026-09-25: no payroll or timesheet tools. Time capture here is for BI (section I), not payroll.

### K. Jobs beyond the route
- Openings and closings, green-to-clean, liner replacement, salt system conversion, expansion joint sealant.
- Paper-contractor job playbook (The Shallow End): a reusable process for any job run through subcontractors, with notes and a registry. Becomes the project/job module.
- `OPEN` salt conversion and expansion joint sealant have no detail on record beyond the names.

### L. Compliance
- Commercial pools: log retention by jurisdiction (example: California Title 22 §65523, 2 years). Residential: no statute found; treat documentation as a contract and insurer requirement.
- Chemical handling: SDS library, written HazCom program checklist, DOT Materials of Trade limits per vehicle (≤ 440 lb aggregate) as a truck-load check.
- Licensing boundary: repair triggers licensure in many states; maintenance generally does not. Flag jobs that cross it. NJ HIC registration is the local case.

### M. AI layer
- Field assistant (a constitution was drafted, status DRAFT). Voice entry for wet hands. Agent-built features through the Producer → Silas → Builder → Inspector pipeline.
- Equipment telemetry (Pentair, Hayward, Jandy, Blue Connect): every integration today is reverse-engineered and can break silently. Defer; do not design around it.

### N. Data portability
- Skimmer import and export for migration (`OPEN`: export format is support-gated).
- No interchange standard exists in this industry. A published open schema would be a wedge. Idea only.

---

## 5. Architecture

`PROPOSED` throughout. Trade-offs are stated so an agent can argue the other side.

```
Phone (PWA, offline queue)
        │  HTTPS, JSON, idempotent writes
        ▼
Cloudflare Worker  ── auth, tenancy check, validation
        │
        ├── D1        relational data (tenants, pools, visits, readings…)
        ├── R2        photos, PDFs, receipts
        ├── Queues    notes, emails, PDF renders, exports
        └── Chemistry engine  (see 5.3)

bld-golden (Docker)  ── Liner Measure Pro (FastAPI) until it is folded in
```

### 5.1 Tenancy
| Option | For | Against |
|---|---|---|
| One D1 database, `tenant_id` on every row | Simple, one migration path, cross-tenant BI is easy | One bug leaks data across companies; size ceiling is shared |
| One D1 database per tenant | Strong isolation, per-tenant export and delete are trivial | Migrations run N times; cross-tenant benchmarks need a separate pipeline |

`PROPOSED` start with one database and `tenant_id`, enforced in a single data-access layer and proven by a test that tries to read another tenant's rows. Revisit at the first paying customer who asks about isolation. Check current D1 limits (developers.cloudflare.com/d1/platform/limits) before committing.

### 5.2 Offline and autosave
Backyards lose signal. The route module will not survive online-only for long.
- Client generates the id for every record (UUID). Writes are idempotent: sending the same write twice changes nothing.
- Unsent writes wait in a queue on the phone and replay in order when signal returns.
- Autosave on every field blur; a refresh restores the form (pattern already proven in Liner Measure Pro).
- `OPEN` Gate 1 call 4: is online-only acceptable for slice 1? `PROPOSED` answer: yes for slice 1, with client-generated ids from day one so offline can be added without a data migration.

### 5.3 Where the chemistry engine runs
| Option | For | Against |
|---|---|---|
| Keep it Python, run as a Cloudflare Python Worker | No rewrite of 93 KB of cited code | Python Workers support pure-Python and Pyodide packages only; must confirm the file has no unsupported dependency |
| Keep it Python, run as a FastAPI service on bld-golden | No rewrite; same stack as Liner Measure Pro | A home server becomes part of a paid product's uptime |
| Port to TypeScript | Runs in the Worker and on the phone (offline dosing) | A rewrite. Hand-rolling under Chi's rule; needs her OK; every constant must be re-verified |
| Run USGS PHREEQC, compiled to WebAssembly, with a small pool database | The standard, public-domain engine for saturation indices; runs in the Worker and could run on the phone; no hand-written chemistry | New engine rather than the 93 KB file; constants for chlorine and cyanuric acid had to be added (cited) |

`DECIDED` 2026-10-08, Chi: "create pool_chemistry from phreeqc". Built as `packages/pool-chemistry` (see its README). `pool_chemistry.py` is no longer needed for M1; parts of it that are not equilibrium chemistry (manufacturer salt ranges, product lists) can still be brought over later.

### 5.4 Front end
`PROPOSED` Svelte + Vite + Tailwind, because Liner Measure Pro already uses them and its field-UI patterns (feet-and-inches parser, autosave, big closure card) can be lifted without translation. Counter-argument an agent may raise: a larger hiring pool for React.

### 5.5 Auth, billing, email — buy, do not build
Under the no-hand-rolling rule, each of these is an existing component chosen by a short comparison, not written:
- Sign-in and roles (owner, office, tech, customer).
- Subscription billing per pool per month.
- Transactional email and SMS.

`OPEN` component picks. Each needs a one-page comparison with sources and Chi's approval before any install.

### 5.6 History as events
`PROPOSED` an append-only `event` table records every change (who, when, what, before, after). It gives the repo model (module D) its commits, gives BI its timeline, and gives a commercial pool its audit log, all from one mechanism.

---

## 6. Chemistry engine contract

The engine is a library with no network and no database. Input: readings, pool attributes, product list, jurisdiction. Output: index, doses, warnings, each with its source.

**Golden tests — the engine is not accepted until these pass exactly**

| Case | Expected | Basis |
|---|---|---|
| Chlorine dose (design.md criterion) | 61.4 fl oz of 12.5% trade-% liquid chlorine | R15 |
| Acid dose from acid-demand count | 91.7 fl oz of 31.45% muriatic acid | Wojtowicz acid-demand |
| Saturation index | LSI −0.22, TDS basis ANSI/APSP-11 | R14 |

Inputs for each case are in `design.md` on bld; copy them into the test file unchanged.

`PROPOSED` (2026-10-08, with the PHREEQC engine; Chi to accept or reject):
- Chlorine: the engine's trade-percent dose gives 61.44 fl oz for a 3 ppm rise in 20,000 gal of 12.5%. That matches 61.4 if those are design.md's inputs; not checked until design.md is copied in.
- Saturation index: PHREEQC computes the calcite saturation index from activities (Plummer and Busenberg 1982 solubility), not the ANSI/APSP-11 LSI formula, so it will not give −0.22 exactly. Proposed replacement gate: the native-vs-WebAssembly parity goldens, Wojtowicz's published HOCl table (within 2.5%), and Wojtowicz's revised SI equation (within 0.1; 0.063 worst over 324 waters).
- Acid: PHREEQC titrates the measured pH, alkalinity, CYA and borates to the target pH, so it gives an amount without an acid-demand count. That conflicts with the first rule below; Chi to decide whether the titration replaces the demand count or must agree with it.

**Rules the engine enforces**
- No acid amount without an acid-demand count.
- Salt target looked up by cell manufacturer and model; unknown model → ask, do not guess.
- Every product carries name, strength and strength basis (trade % or weight %).
- Every limit carries source, edition and jurisdiction.
- CYA: report both the ratio view and the range view; flag which rule the tenant's jurisdiction uses.

---

## 7. Data model (first cut)

`PROPOSED`. Fields marked ★ are the ones competitors leave as free text or do not record.

| Table | Key fields |
|---|---|
| `tenant` | id, name, jurisdiction, chemical_billing_mode |
| `user`, `membership` | role: owner / office / tech / customer |
| `customer` | id, tenant_id, name, contact, lead_source ★, referred_by ★ |
| `service_location` | address, access notes, gate code (encrypted) |
| `body_of_water` | gallons, surface_type ★, sanitizer_system ★, swg_make_model ★, sun_exposure ★, enclosure ★, baseline_filter_psi, targets ★ |
| `equipment_item` | class, make, model, installed_on, warranty_until |
| `route`, `route_stop` | day, tech, sequence |
| `visit` | arrived_at ★, departed_at ★, gps ★, skipped_reason ★, callback_of_visit ★ |
| `reading` | visit_id, parameter, value, method (drop / strip / meter) |
| `dose_recommended`, `dose_applied` | product_id, amount, unit, engine_version |
| `product` | name, strength, strength_basis ★ |
| `condition_flag` | visit_id, item (liner, plaster, tile, joint), grade good/fair/poor ★ |
| `visit_note`, `photo` | text; R2 key |
| `rule` | jurisdiction, parameter, min, max, source, edition |
| `measure_job`, `measure_point` | from Liner Measure Pro |
| `order`, `order_commit`, `order_review` | repo model |
| `lead`, `quote` | tier, source, status |
| `subscription`, `invoice`, `payment` | from the billing component |
| `cancellation` | reason_code ★, voluntary_by_operator ★ |
| `event` | append-only history |

---

## 8. Non-functional requirements

| Area | Requirement | How it is checked |
|---|---|---|
| Field speed | A stop's readings entered and doses shown in under 60 seconds, one thumb | Timed on a real phone |
| Sunlight | Text contrast computed, then confirmed outdoors on a Pixel | Contrast numbers + a photo |
| Touch | Targets at least 48 px; no control needs two hands | Automated check + phone walk |
| Data loss | Refresh or signal loss mid-stop loses nothing | Test kills the network mid-form |
| Isolation | One tenant can never read another's rows | Test that tries, and must fail |
| Privacy | Customer names, addresses and gate codes are personal data; no real ones in tests | Fixture lint in CI |
| Cost | Runs inside Cloudflare's paid base plan until there is revenue | Monthly bill check |
| Seasonality | Cron and billing logic handle a 5-month season and a 12-month contract | Unit tests on both calendars |
| Time zones | Workers cron is UTC and ignores daylight saving | Test across a DST boundary |

---

## 9. What already exists — do not build twice

| Asset | Where | Reuse |
|---|---|---|
| Liner Measure Pro | `Alphav00/liner-measure-pro` | Module C; UI patterns for everything |
| `pool_chemistry.py` | Chi's files; not yet staged | Module B after header and defaults are cleaned |
| `chem_path_dspy_program.py` v1.1.0 | Chi's files | Forecasting, later |
| Gate 1 design, slice 1 | bld: `designer/runs/v0-2/design.md` | Module A acceptance criteria |
| Run brief | project doc `claude/R28-pool-saas-run1-brief.md` | Constraints, market table |
| Domain research | project docs `R9`, `R10`, `R11`, `R12` | Rules, limits, market, what not to do |
| UI assessment | project doc `claude/R29-…` | Field-UI fix list |
| Liner lead kit | project docs `pool-liner-*`, `pool-lead*`, `how-to-find-pool-leads` | Module E |
| Liner measuring guide (PDF, 2026-03-28) | project file | Module C checklist. `OPEN`: authorship ("Ryan H") unresolved |
| The Diving Board | `Alphav00/the-diving-board` | Boss-visible ideas board; CCS-branded; separate from this product |
| The Shallow End | shallow.pathofphi.com (Vikunja, decided) | Job playbook for module K |
| Prototypes: PoolboiDB, pool-boi-v2, Pool Log, pool-calc, pool_ticket | project docs | Patterns only. No data, no LSI code |

---

## 10. Milestones

Each milestone has sub-tests in the form "action gives result". A milestone is done only when every sub-test passes and a second agent has re-run them. Milestones M0–M3 are the first product; the rest are ordered by dependency, not by date.

**M0 — Repository and guard rails**
- New private repo under Chi's account. `OPEN`: repo name.
- CI runs lint, tests, and a fixture lint that fails on any CCS name, real address or real customer name.
- Sub-tests: `git clone` + one command runs the test suite green · a fixture containing a denylisted string fails CI · no secret in the repo (secret scan passes).

**M1 — Chemistry engine callable**
- Clean the header and defaults of `pool_chemistry.py`; decide where it runs (5.3).
- Sub-tests: the three golden cases in section 6 return exactly · acid with no demand count returns no amount · unknown salt cell returns a question, not a number.
- Status 2026-10-08: engine callable as `@poolos/pool-chemistry` and at `/api/chem/*`. Missing readings and missing label facts return questions. Golden cases pending design.md and the section 6 proposal.

**M2 — One stop, end to end (the Gate 1 slice)**
- Tech opens today's route, picks a stop, enters readings, sees doses by product and strength, logs what was added, closes the stop; a service note exists.
- Sub-tests: the 10 criteria in `design.md`, unchanged · every write goes through the Worker · a refresh mid-stop restores every field.
- Blocked on: Gate 1 answers.

**M3 — Wet-hands proof**
- Sub-tests: timed stop under 60 seconds on a Pixel · outdoor photo of the screen in direct sun, readable · every control reachable with one thumb.

**M4 — Accounts and tenancy**
- Sign-in, roles, a second company. Sub-tests: tenant B cannot read tenant A · a tech cannot see billing.

**M5 — Route day and instrumentation**
- Route list, sequence, arrival and departure stamps, skipped-stop reason. Sub-tests: a completed day yields stops per tech, minutes on site, minutes between stops.

**M6 — Offline**
- Sub-tests: complete a stop in airplane mode, reconnect, the visit appears once · two replays of the same write leave one row.

**M7 — Customer note delivery and review ask**
- Sub-tests: closing a stop sends one note · the note contains readings, doses, tech name · one review ask per visit, never two.

**M8 — Billing**
- Per-pool subscription for the operator; operator-to-customer invoicing later. Sub-tests: adding a pool changes the next invoice · 12-month and seasonal plans both bill correctly across a year.

**M9 — Condition flags and quotes**
- "Liner condition" and similar flags on the visit; a poor grade opens a quote. Sub-tests: a poor flag creates exactly one open quote.

**M10 — Measure inside PoolOS**
- Liner Measure Pro behind the same sign-in, jobs tied to a body of water. Sub-tests: a measured job appears on the pool's record · both PDFs still generate.

**M11 — Orders as repositories**
- Commit history, review branch, visual diff, release tag. Sub-tests: a changed measurement creates a commit · a revert restores the previous order exactly.

**M12 — Owner dashboard**
- Sub-tests: every number on the screen shows its formula and the count of records behind it.

**M13 and later** — equipment and warranty, leads pipeline, crew layer, compliance pack, import/export, AI assistant.

---

## 11. Handover to Claude Code

**Read first, in this order:** this document → project doc `claude/R28-pool-saas-run1-brief.md` → bld `designer/runs/v0-2/design.md` → `claude/R29-…` for field-UI lessons.

**Rules of engagement**
1. Status first in every reply: done, not done, or blocked on what.
2. Before building anything: search skills, clone candidate repos and grep them. State what was found.
3. No custom component where an official one exists. If custom code seems needed, stop and ask Chi.
4. Every command given to Chi comes with its expected output and its failure cases.
5. Branch and pull request for every change. Chi merges, or says "merge".
6. Anything that exposes a service, spends money, deletes data or touches credentials stops for Chi's approval.
7. A second agent re-runs the sub-tests. The builder does not certify its own work.

**Kickoff prompt for M0 + M1** (paste into Claude Code once Gate 1 is answered and a repo exists)

```
You are building PoolOS, Chi's own pool-company SaaS. Read docs/DESIGN.md fully before acting.

Task: milestones M0 and M1 only. Stop after M1 and report.

M0: scaffold the repo (Cloudflare Workers + D1 + R2, Svelte + Vite + Tailwind front end),
CI with lint, tests, secret scan, and a fixture lint that fails on any string in
tests/denylist.txt.

M1: bring in pool_chemistry.py from inputs/. Remove the CCS author line and CCS equipment
defaults. Do not change any constant or formula. Write the three golden tests from
DESIGN.md section 6 with inputs copied from inputs/design.md. Report whether the file
runs unmodified as a Cloudflare Python Worker; list any import that blocks it.

Constraints: DESIGN.md section 3, all thirteen. No custom auth, billing or email code.
No real customer data anywhere. Work on a branch; open a pull request; do not merge.

Report format: first line DONE / NOT DONE / BLOCKED ON <what>. Then: each sub-test with
the command run and its literal output. Then: anything you could not verify.
```

**Needed from Chi before kickoff:** Gate 1 answers · repo name and creation · `pool_chemistry.py` and `design.md` copied into `inputs/` · OK on where the chemistry engine runs.

---

## 12. Risks

1. **Who owns the measuring code.** Liner Measure Pro sits on a CCS-branded, boss-visible board, and the boss and techs are getting access. If it ships inside Chi's paid product, ownership should be settled in writing first. The same applies to anything built on work time or from CCS data. Not legal advice; a question for someone qualified.
2. **Guide authorship.** The measuring guide is attributed to "Ryan H". Until that is resolved, do not present its method as PoolOS's own.
3. **Scope.** Fourteen modules is several products. The Business OS skeleton's own rule applies: nothing downstream starts until the first slice is real and used at one real stop.
4. **Head-on competition.** Skimmer has a large installed base and already ships dosing on its higher tier. The price gap can be closed by them in one release. The durable edges are the field UI, the cited chemistry rules, and the data nobody else captures.
5. **Chemistry liability.** A wrong dose is a safety matter. Mixing hazards are real (R9 §8.6). Every dose shows its inputs and source; the engine refuses rather than guesses.
6. **Home server in a paid path.** Anything on bld-golden is one power cut from an outage.
7. **Seasonality.** NJ-only sales mean a five-month selling window.
8. **One builder.** Chi is self-taught and works from a phone. Every step must be checkable by running something, not by reading code.

---

## 13. Open decisions for Chi

| # | Decision | Blocks |
|---|---|---|
| 1 | Gate 1: build the slice — go or no-go | M2 |
| 2 | Price: $1/pool/month with dosing included? | M8, positioning |
| 3 | Name: PoolOS for everything, or a separate product name | Repo, domain, brand |
| 4 | Slice 1 online-only? | M2 scope |
| 5 | Minimum readings per stop, or all optional | M2 |
| 6 | ~~Chemistry engine: Python Worker, bld service, or approved port~~ Decided 2026-10-08: PHREEQC in WebAssembly | M1 |
| 7 | Tenancy model | M4 |
| 8 | Ownership of Liner Measure Pro for commercial use | M10 |
| 9 | Auth, billing, email and SMS components | M4, M7, M8 |
| 10 | Does CCS become customer #1, and who asks | Pilot |
| 11 | RMA, warranty and distributor process written down | Module H |
| 12 | Salt conversion and expansion joint sealant: what they involve | Module K |

---

## 14. Agent suggestions — append only

Every agent on the board adds one suggestion. Rules:

1. Add a new card. Do not edit, move or delete the document card or any other agent's card.
2. Card id: `poolos-sug-<your code name>`. Title: `PoolOS suggestion · <code name> · <5 words>`.
3. One suggestion per card: what to change, which section, why, and proof (a path, a source link, a failing output or a test that would show it).
4. Disagreement with another suggestion is a new card that names the card it answers.
5. Corrections to this document are also new cards. Claude folds accepted ones into v0.2 as dated lines below; v0.1 text stays.

*(No suggestions yet.)*

### 14.1 Corrections (dated lines; earlier text stays)

- 2026-10-08 · §5.3, §13 #6 · `DECIDED` Chi: "create pool_chemistry from phreeqc". The engine is USGS PHREEQC in WebAssembly (`packages/pool-chemistry`). The 2026-10-08 lines added inline in §5.3, §6, §10 M1 and §13 were written before this subsection existed; from here on corrections are added here only.
- 2026-10-08 · §3 #9, §6 rules, §10 M1 · `DECIDED` Chi: "Use the PHREEQC titration". The acid amount is PHREEQC's titration of the measured pH, total alkalinity, cyanuric acid, borates and temperature to the target pH. It replaces the acid-demand count. §3 #9 still holds as written: the amount is never computed from pH alone; without a total alkalinity and a cyanuric acid reading the engine returns a question, not an amount. M1 sub-test "acid with no demand count returns no amount" becomes "acid with no TA or CYA reading returns a question".
- 2026-10-08 · §6 golden tests · Chi: "proceed automated using my decision Matrix". The §6 `PROPOSED` lines of 2026-10-08 are taken as the gate: native-vs-WebAssembly parity, Wojtowicz's HOCl table within 2.5%, Wojtowicz's revised SI equation within 0.1. The LSI −0.22 case is retired (different formula). The 61.4 fl oz case stays `UNVERIFIED` until `inputs/design.md` is copied in; the engine gives 61.44 for 3 ppm in 20,000 gal of 12.5%.
- 2026-10-08 · §6 rules · Salt target by cell make and model: the table lives in `packages/pool-chemistry/src/saltCells.ts`, each row with the manufacturer document URL and a verbatim quote. Unknown make or model returns a question.
- 2026-10-08 · §3 #7, #11 · Targets and limits in slice 1 are the tenant's own policy, entered by the owner with a source line, and shown as such ("set by <company>"). PoolOS ships no target numbers of its own until a limits table with source, edition and jurisdiction exists (§7 `rule`).
- 2026-10-08 · §10 M2 status · The core loop runs on the engine: saved readings → `/api/chem/analyze` (saturation index, carbonate vs cyanurate alkalinity, HOCl) and `/api/chem/dose` for every reading outside the company's target range, to the middle of the range, by the company's own product with its label strength. Products and targets are kept at `settings/products` and `settings/targets` in the field store (More → Chemistry setup). Sub-test "every write goes through the Worker" holds for readings and settings. Sub-test "the 10 criteria in design.md" stays `UNVERIFIED` (file not in the repo). Gate 1 itself is still `OPEN`; the slice runs on the sample tenant.
- 2026-10-08 · decisions are also logged in `docs/DECISIONS.md` (options, choice, why, evidence, falsifier), the format Chi uses elsewhere.
- 2026-10-09 · §1 owner, §3 #1, §13 #3 and #10 · `DECIDED` Chi: "No plan for this to be a white label app, so we need some type of way that it could easily store their assets and design system in a folder and use CCS pools as a tester. Their boss is viewing it now, and plans to test it." CCS Pools is the first tester. Its name, logo and colours live only in `brands/ccs-pools/`, picked at build time (`BRAND=ccs-pools`, set in deploy.yml); app code names no company. §3 #1 still holds for inputs, fixtures, tests and screenshots, and still bars CCS customers, addresses, prices and service history everywhere. §1 owner is unchanged. §12 risk 1 (who owns the code) is still open. Testers report problems in the app (More → Report a problem); see `docs/TEST-DAY.md`.

- 2026-10-10 · §3 #1, §13 · `DECIDED` Chi: S&M Pools is the second tester. The main site gets a sign-in with placeholder usernames, one per company (the brand pack id), and after sign-in the company's loading screen. Both packs ship in one build (`BRAND=ccs-pools,sm-pools`); the username only picks the brand, Cloudflare Access is still the real sign-in. Both testers share the same boards and D1, so §3 #1 now also bars either company's real customers from the shared data. See DECISIONS d0021 and `brands/README.md`.
- 2026-10-10 · §3 #1 · `DECIDED` Chi: the two testers must not share staff and pools. Team boards are now kept per company (`<board>@<company>` in D1, picked by the `poolos_company` cookie the sign-in sets); the default company keeps the plain boards. Owner boards and Measure jobs are still shared. S&M wears its dark "night pool" theme. See DECISIONS d0022.

---

## 15. Sources

- Project docs, The Deep End: `claude/R28-pool-saas-run1-brief.md` · `claude/R29-liner-measure-pro-ui-assessment-and-hosting.md` · `R9-pool-service-domain.md` · `R12-consultant-review.md` · `CCSPools_BusinessOS_Skeleton_v0.1.md` · `POOLBOY-CCS_ROADMAP.md` · `pool-cover-measurement-app-brief.md` · `pool-liner-business-model (2).md`
- Chat "Git-driven pool fabrication SaaS", 2026-10-06 (repo model; Gate 1 text; three corrections)
- [PoolDial: best pool service software 2026](https://pooldial.com/resources/articles/software-reviews/best-pool-service-software) — competitor-published; read as marketing
- [PoolDial: Skimmer alternatives](https://pooldial.com/resources/articles/software-reviews/skimmer-alternatives)
- [Capterra: Pool Brain](https://www.capterra.com/p/194225/Pool-Brain/)
- [Skimmer: automatic service reports](https://www.getskimmer.com/why-skimmer/qna-hub/how-can-pool-service-companies-automatically-send-service-reports-after-each-visit)
- [Cloudflare: Python Workers packages](https://developers.cloudflare.com/workers/languages/python/packages/)
- [Cloudflare: D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

Not re-verified today: figures carried from R9, R12, R17/R18 and R28; Pool Brain pricing; the contents of `design.md` beyond what the Gate 1 message quoted.
