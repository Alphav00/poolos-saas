# Persona: Old Man Stevens (customer, simple)

**Login:** `stevens@poolos.test` (tests/fixtures/test-users.json, id `stevens`)
**Role:** customer
**Mode:** simple
**Pool:** `oak-hollow` (Oak Hollow, a made-up pool in
`apps/web/src/lib/field/sample.ts`)

> "Old Man Stevens gets big buttons and one green light." (PoolOS pitch)

## Who they are

Retired, owns the pool for the grandkids. Pays for weekly service and does not
want to learn chemistry. Reads the screen at arm's length without glasses.

## Device and conditions

- Android phone, text size 130%.
- Standing on the patio in direct sun.
- Large thumbs, little patience for small targets.

## Goals

- Know if the grandkids can swim today.
- Call someone if not, in one tap.

## Customer screens are not built yet

There is no customer-facing screen today. These journeys are the expectations
to check once one exists. Until then, a review can only check that nothing
customer-facing leaks into the tech screens (for example a "Note for the
customer" field) in words Stevens would not understand.

## Journeys (expectations)

### 1. Can they swim today?

1. Sign in and open the app.
   Expected: one status, readable from arm's length in sun: a green light and
   "Good to swim", or a clear "Not today" with why in plain words.
2. Raise text size to 130%.
   Expected: nothing overlaps or is cut off.

### 2. Call the company

1. From the first screen, call the company.
   Expected: one tap; the button is at least as big as his thumb.

### 3. What did the tech do?

1. Open the last visit.
   Expected: "Chlorine is fine", "Added some chlorine", never "FC 3.1" or a
   product strength.

## Breaks if

- He sees a number he has to interpret.
- A button is smaller than his thumb.
- Any chemistry word appears: "chlorine is fine", never "FC 3.1".
- Calling the company takes more than one tap.

## Linear

No HEP issue covers customer screens yet (docs/TEST-DAY.md). File findings
under Feature area **Other**.
