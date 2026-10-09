# Persona: the dispatcher

**Login:** none in tests/fixtures/test-users.json yet. Use
`owner@poolos.test` for what exists today; a dispatcher login (for example
`dispatcher@poolos.test`) can be signed by the e2e harness once roles land.
**Role:** Dispatcher (Staff screen, coming). May edit pool profiles.
**Mode:** dashboard
**Tenant:** `test-01` (Sample Pool Co., made up)

## Who they are

Works the office: the boss's right hand, or the boss. Starts before the trucks
leave, ends after the last stop. Reviews the day, moves stops between techs,
reads what came back from the field and answers the crew.

## Device and conditions

- Desktop or laptop at a desk most of the day, phone when out of the office.
- Interrupted constantly: phone calls, walk-ins, techs asking questions.

## Goals

- Know by 7:15 who is out, where, and what the weather will do to the day.
- Assign and reorder stops without calling every tech.
- See problems from the field the same day: bad readings, skipped stops,
  reports.

## Journeys

### 1. Morning check (HEP-3)

1. Open **Today** on a desktop.
   Expected: the layout still works at desktop width; nothing is stretched or
   cut off.
2. Tap **Show weather**.
   Expected: today's conditions and rain chance. With location off or the
   weather service down, a plain message, never an endless "Loading…".
3. Read **Today's route** and **Working today**.
   Expected: route progress, the next stop and who is on break or off; DEMO
   marked.

### 2. Check the chemistry setup before trucks leave (HEP-4)

1. **More → Chemistry setup**.
   Expected: the company's products with label strengths and target ranges,
   each with where it came from.
2. Change one target and tap **Save setup**.
   Expected: saved; the next dose on a pool screen aims at the new range.

### 3. Assign and reorder (coming, HEP-5, HEP-6)

Not built. When scheduling arrives:

1. Move a stop from Route B to Route C.
   Expected: both techs see the change without reloading.
2. Change the order of stops on a route.
   Expected: the route map and "Next" on Today follow the new order.

### 4. Staff and pool profiles (coming)

When **More → Staff** lands:

1. Open Staff and check each person's role.
   Expected: roles read Technician, Lead, Dispatcher or Operator.
2. As a Dispatcher, open a pool profile and change a note.
   Expected: the edit is allowed and saved with your name and the time
   (stamped by the server, not the form).

### 5. Read the field's reports and messages (HEP-13, HEP-14)

1. **More → Report a problem**, read **Reports so far**.
   Expected: newest reports with severity and area; Linear id when filed.
2. **Messages** tab.
   Expected today: the Shallow End board. Coming: a native Messages board at
   `#/messages`.
3. Reply to a tech's question.
   Expected: the tech sees the reply on their phone.

### 6. End of day (HEP-15, HEP-16)

Not built: chemical log review and billing. Check that nothing in the app
claims they work.

## Breaks if

- A screen only works at phone width and breaks on a desktop.
- A number appears without the records behind it (same rule as the owner).
- A tech's report or message is lost or arrives without who and when.
- A change of target or assignment needs a reload on every phone to show up.

## Not built yet (not a bug)

Scheduling and assigning (HEP-5), route optimisation (HEP-6), clock in
(HEP-7), chemical log review (HEP-15), billing (HEP-16).
