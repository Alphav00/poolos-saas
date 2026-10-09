# Persona: the owner

**Login:** `owner@poolos.test` (tests/fixtures/test-users.json, id `owner`)
**Role:** owner (today set by `OWNER_EMAILS` in `apps/api/wrangler.jsonc`; the
coming Staff screen lists staff as Technician, Lead, Dispatcher or Operator)
**Mode:** dashboard
**Tenant:** all of `test-01` (Sample Pool Co., made up)

## Who they are

Runs a small pool service company and still does some stops on busy weeks. Set
the app up for the crew and decides whether the company keeps using it. Thinks
in money and time: stops per day, time on site, chemical cost.

## Device and conditions

- Phone in the truck between stops: one thumb, glare through the windshield,
  signal that drops in and out.
- Laptop at night for the numbers and the problem reports.

## Goals

- Get the app ready for the crew in a few minutes (pools on file, chemistry
  set up).
- See the day at a glance without asking anyone.
- Trust every number: each one should show where it came from.

## Journeys

### 1. First morning: load demo data and set up chemistry (HEP-2, HEP-4, HEP-8)

1. Open the app on a phone and add it to the home screen.
   Expected: the icon and name come from the build's brand pack, not "PoolOS"
   unless that is the brand.
2. On **Today**, find the "No pools on file yet" card and tap
   **Load the demo pools**.
   Expected: nine made-up pools load; every pool and crew card shows **DEMO**.
3. Go to **More → Chemistry setup**, tap
   **Load the sample setup (made up; check it)**, then **Save setup**.
   Expected: products show with label strengths; target ranges show with a
   "where these targets come from" line.
4. Open **Route**, then any pool.
   Expected: the pool screen no longer says "Set up chemistry".

### 2. Morning check (HEP-3)

1. On **Today**, tap **Show weather** and allow location.
   Expected: temperature, rain chance, UV and wind, readable in sun. If rain is
   likely, a line says from what hour.
2. Deny location on a second try (or use a desktop with no location).
   Expected: a plain message, not a blank card or a spinner that never stops.
   (Weather hardening with a National Weather Service fallback is coming.)
3. Read the **Today's route** card and **Working today**.
   Expected: stops done vs to go, the next stop, who is working; all marked
   DEMO.

### 3. Add a demo customer (coming)

An owner-only **Add a demo customer** button on Route, which makes up a
customer with a funny name, is being built. When it lands:

1. On **Route**, tap the add-demo-customer button.
   Expected: one new pool appears, marked DEMO, with a clearly made-up name.
2. Sign in as `newhire@poolos.test` (or any non-owner) and open Route.
   Expected: the button is not shown.

### 4. Read what testers reported (HEP-14)

1. Go to **More → Report a problem** and scroll to **Reports so far**.
   Expected: each report shows severity, feature area, who sent it and when,
   and its Linear id when one was filed.
2. File one yourself: pick a part, how bad, fill **In a few words** and
   **What happened**, tap **Send report**.
   Expected: "Thanks, got it." and the report appears in the list.

### 5. Message the crew (HEP-13)

1. Tap the **Messages** tab (or **Message board** on Today).
   Expected today: the Shallow End board opens. Coming: a native Messages
   board at `#/messages`, with Shallow End moving to owners-only under More.
2. Post a short note to the crew.
   Expected: it shows with your name and the time, and a tech sees it.

### 6. Staff and roles (coming, HEP-5)

When **More → Staff** lands:

1. Add a staff member and give them a role (Technician, Lead, Dispatcher,
   Operator).
   Expected: the role saves and shows in the list.
2. Sign in as a Technician and open a pool profile.
   Expected: the profile is read-only. Owners, Leads and Dispatchers can edit
   it.

## Breaks if

- A number appears without the records behind it.
- Every KPI does not show its formula and record count (DESIGN.md M12, not
  built yet).
- Tenant `test-01` can read another tenant's rows (DESIGN.md M4, not built
  yet).
- A "liner: poor" flag does not open exactly one quote (DESIGN.md M9, not
  built yet).
- Set-up takes more than a few minutes, or needs anyone but the owner.

## Not built yet (not a bug)

Schedules and assigning techs (HEP-5), route optimisation (HEP-6), clock in
(HEP-7), chemical log review (HEP-15), billing (HEP-16), KPI dashboard.
