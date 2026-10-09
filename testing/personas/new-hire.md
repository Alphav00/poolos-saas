# Persona: the seasonal new hire

**Login:** `newhire@poolos.test` (tests/fixtures/test-users.json, id `newhire`)
**Role:** tech; on the coming Staff screen, **Technician**. Cannot edit pool
profiles. Checked by `poolguy` (the lead).
**Mode:** guided
**Route:** C

## Who they are

Eighteen, first summer on the job, a week of ride-alongs. Owns a plain
drop-test kit and their own phone. This is the person the product is for
(DESIGN.md §1: "an under-qualified seasonal hire with a phone, a plain test
kit and the right app can service pools competently").

## Device and conditions

- Their own mid-range phone, no case, wet hands, direct sun.
- Plain drop-test kit; no meter.
- Nervous about getting it wrong; will not ask unless it is easy to ask.

## Goals

- Be told the next step, in words they understand.
- Know when to stop and ask someone senior.
- Not break anything or put the wrong thing in a pool.

## Journeys

### 1. Find today's work (HEP-8)

1. Open **Today**.
   Expected: where to go next is obvious within a few seconds.
2. If no pools are loaded: read the "No pools on file yet" card.
   Expected: "Ask an owner to load the demo pools." No **Load the demo
   pools** button for a non-owner.
3. Tap **Route**, then the next stop.
   Expected: the pool screen opens; DEMO is marked.

### 2. Test the water with a drop kit (HEP-10)

1. Tap **Enter today's readings**.
2. Tap each reading (**FC**, **pH**, **TA**, **CYA**, **CH**...), choose
   **Drop kit**, pick or type the value, tap **Next** until **Done**.
   Expected: each step says what to do with the kit in hand. Judge whether
   "TA", "CYA" and "CH" make sense to someone who has never heard them; flag
   it if they are not explained.
3. Tap **Save readings**.
   Expected: **Add now** says which product, how much, and its strength, in
   words a first-week hire can act on.

### 3. A dose that looks too big (coming)

1. Enter a very low FC on a large pool (e.g. **Oak Hollow**, 30,000 gal) and
   save.
   Expected (DESIGN target, not built): a dose over the safety ceiling waits
   for the senior's OK instead of being shown as a plain instruction. Today:
   report what it does.

### 4. Ask a senior (HEP-13)

1. From the readings screen, the pool screen and Today, look for a way to ask
   someone.
   Expected (from test-users.json): "Ask a senior" reaches someone from any
   screen. Today there is no such button; the nearest is the **Messages**
   tab (Shallow End board now, a native Messages board coming). Report how
   long it took to find.
2. Post a question on Messages.
   Expected: the lead or dispatcher can see who asked and when.

### 5. Report something confusing (HEP-14)

1. **More → Report a problem**.
2. Pick **Tech Field Portal**, **Minor**, fill **In a few words** and
   **What happened**, tap **Send report**.
   Expected: "Thanks, got it." The form never asks for words a new hire
   would not know.

## Breaks if

- The app assumes they know what TA or CYA means.
- A step does not say what to do with the kit in hand.
- A dose over the safety ceiling does not wait for the senior's OK.
- "Ask a senior" cannot be reached from every screen.
- An error message blames them or uses jargon ("401", "PUT failed").

## Not built yet (not a bug)

The guided mode itself, "Ask a senior", senior sign-off on large doses, clock
in (HEP-7), checklist and photos (HEP-11). Report the gaps anyway as **Idea**
or **Major**: this persona is the product thesis.
