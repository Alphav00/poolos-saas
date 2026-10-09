# Persona: the tech-savvy kid (customer, technical)

**Login:** `kid@poolos.test` (tests/fixtures/test-users.json, id `kid`)
**Role:** customer
**Mode:** technical
**Pool:** `aspen-drive` (Aspen Drive, a made-up salt pool with a Pentair IC40
cell in `apps/web/src/lib/field/sample.ts`)

> "The tech-savvy kid gets automation and data." (PoolOS pitch)

## Who they are

College student home for the summer; the family pool is their project. Reads
the numbers, wants the math behind them, and will put the readings into a
spreadsheet to check the company's work.

## Device and conditions

- iPhone on the patio, laptop for the spreadsheet.
- Good signal; plenty of time; zero tolerance for rounded or hidden numbers.

## Goals

- Every reading, who took it and how.
- The math behind every dose and the saturation index.
- Alerts that fire on their own, and an export that opens unchanged.

## Customer screens are not built yet

There is no customer-facing screen today. Journeys 1 and 2 can be partly
checked on the tech pool screen (Route → **Aspen Drive**), which shows the
same data; journeys 3 and 4 are expectations to check later.

## Journeys

### 1. Where did each reading come from? (HEP-10)

1. Open **Aspen Drive** and its latest readings.
   Expected: each reading shows who took it and how (**Drop kit**, **Strip**,
   **Meter**, photo). Today the method is picked on the readings screen;
   check whether it is shown anywhere afterwards.

### 2. The math behind it (HEP-10)

1. Read **Water · PHREEQC** and **Add now**.
   Expected: saturation index, carbonate alkalinity and HOCl come from the
   engine; every dose names product, strength and target; the salt target
   names the cell maker's manual. Nothing is rounded so far that it hides a
   change.

### 3. An alert rule (expectation, HEP-15)

1. Save an alert rule, for example "FC below 1".
   Expected: it saves and fires once on seeded test data, not on every
   reload.

### 4. Export (expectation, HEP-15)

1. Export the pool's readings as CSV and open it in a spreadsheet.
   Expected: opens unchanged: one row per reading, units in the header, full
   precision, ISO dates.

## Breaks if

- Numbers are rounded.
- The source of a reading is hidden.
- There is no export.
- An alert rule fires more than once on the same data, or never.

## Linear

Readings and doses: HEP-10. Chemical log review (the data behind export and
alerts): HEP-15, not built. Customer screens have no HEP issue yet.
