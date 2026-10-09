# Persona: the lead tech ("the pool guy")

**Login:** `poolguy@poolos.test` (tests/fixtures/test-users.json, id `poolguy`)
**Role:** tech; on the coming Staff screen, **Lead**. May edit pool profiles
and checks the new hire's work.
**Mode:** full
**Route:** B

## Who they are

Years on the route. Knows the water by sight and wants the app to keep up, not
teach. Checks the seasonal hire's pools on rotation.

## Device and conditions

- Pixel in a wet case, gloves on, noon sun straight overhead.
- One thumb; the other hand holds the test kit or the pole.
- Signal comes and goes between houses.

## Goals

- Readings in, doses out, next stop, without slowing down.
- Every dose names the product and its strength, so nothing is guessed at the
  truck.
- Never retype anything because the app lost it.

## Journeys

### 1. A full stop in under 60 seconds (HEP-8, HEP-10)

Needs the chemistry setup saved first (see owner.md journey 1).

1. **Route** tab → tap **Maple Court**.
   Expected: the pool screen with tags, equipment and the decay chart.
2. Tap **Enter today's readings**.
   Expected: the readings screen; the tab bar is hidden.
3. Tap **FC**, pick a value on the wheel or type it, choose **Drop kit** or
   **Strip**, tap **Next · pH ▸**; continue through the readings; tap **Done**.
   Expected: every control is reachable with one thumb and at least 44 px.
4. Tap **Save readings**.
   Expected: back on the pool screen, **Water · PHREEQC** shows saturation
   index, carbonate alkalinity and HOCl; **Add now** lists amounts by product
   and strength, with the target under each.
5. Time it from opening the pool to doses on screen.
   Expected: under 60 seconds (DESIGN.md M3).

### 2. Leave readings out (HEP-10)

1. Save readings with only FC and pH.
   Expected: the pool screen lists what the engine still needs and shows no
   acid amount. It never guesses.

### 3. Interrupt yourself (HEP-10)

1. Halfway through entering readings, go back, open another pool, come back.
   Expected: "Not saved yet · kept on this phone until you save", and every
   value still there.
2. Kill the app and reopen; rotate the phone.
   Expected: nothing typed is lost until **Save readings** or a clear.
3. Turn on airplane mode and tap **Save readings**.
   Expected: a clear message and a way to try again; nothing typed is lost.

### 4. Salt pools (HEP-10)

1. Open **Cedar Ridge** or **Aspen Drive**, enter a low salt reading, save.
   Expected: an amount aimed at the cell maker's figure, naming the manual.
2. Open **Maple Court** and do the same.
   Expected: it asks which cell it is instead of giving a number.

### 5. Pool profile and the new hire's work (HEP-9, coming)

1. Open a pool and read its profile.
   Expected today: tags, equipment and decay chart. Missing today: gate code,
   access notes, customer contact.
2. When roles land: as Lead, edit a pool profile note.
   Expected: allowed, and saved with your name and the time.
3. Open a Route C pool the new hire saved today.
   Expected (coming): you can see who took each reading and how.

### 6. Measure a liner (HEP-12)

1. **More → Measure** (or **Measure a liner or cover** on Today).
2. Tap **Try a sample pool…**, then **Load** next to `kidney-liner`.
   Expected: the 3D model has two lobes and a waist.
3. Open the job and try **Swap A/B**.
   Expected: the shape mirrors; nothing breaks.

## Breaks if

- A control needs two hands, or the screen washes out in sun.
- A stop takes 60 seconds or more with one thumb (DESIGN.md M3).
- Any dose does not name the product and its strength.
- A refresh mid-stop loses anything.

## Not built yet (not a bug)

Clock in (HEP-7), checklist, photos and closing the job (HEP-11), "log what I
added", route order (fixed demo order).
