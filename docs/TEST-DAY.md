# Test day

How a company trying the app runs a normal day on it, and where problems go.
The live site wears the tester's brand pack (`brands/README.md`). The steps
are also Linear issues in the PoolOS team, project **CCS Pools test drive**:
parent [HEP-1](https://linear.app/holoeyes/issue/HEP-1), one sub-issue per step.

## Before the tester signs in (Chi)

1. Add each tester's email to the Cloudflare Access policy for
   poolos.pathofphi.com. Nobody gets in without it.
2. Put each tester on their company's staff list: sign in, pick the company,
   More → Staff. Anyone not on it sees "Not on a team yet" (DECISIONS d0023).
   Give the people who will add customers the Lead or Dispatcher role;
   Technicians can work the route but not add or change customers.
3. Optional: More → Remove demo data clears anything made up from earlier
   tries (customers, their readings and staff marked DEMO).
4. Invite each tester to the Linear workspace (team PoolOS). Reports are
   filed in Linear under the tester's own Linear sign-in, so they need a
   seat; without one, their reports still save in the app and Chi files them.
   Being in Linear also lets them tick off the test tasks themselves.

## The day

| Time | Who | Step | In the app today | Linear |
|---|---|---|---|---|
| 6:45 | everyone | Put the app on the phone | Works: Add to Home Screen; icon and name come from the brand pack | HEP-2 |
| 6:50 | office | First run | Works: Get started card on Today and Route: add the first customer (name, address, phone, service day, size, surface, chlorine source, notes), set up chemicals, work the route | HEP-3 |
| 7:00 | office | Morning check | Works: weather, today's route (customers whose service day is today, done count, next stop), who is working | HEP-3 |
| 7:15 | office | Chemicals and target ranges | Works: More → Chemistry setup | HEP-4 |
| 7:30 | office | Schedule cleanings and repairs, assign techs | **Not built** | HEP-5 |
| 7:45 | office | Route order and optimisation | Works: ▲▼ on Route sets each day's order (Owner, Lead, Dispatcher). **Not built**: optimisation, map | HEP-6 |
| 8:00 | tech | Clock in | **Not built** | HEP-7 |
| 8:15 | tech | Walk the route | Works: Route tab, today's stops in order, next stop, a stop is ticked done when its readings are saved. **Not built**: truck load, forecasts | HEP-8 |
| 8:30 | tech | Pool profile | Works: address (opens maps), tap-to-call phone, service day, size, surface, chlorine source, notes; Edit for Owner, Lead, Dispatcher | HEP-9 |
| 8:40 | tech | Test, log readings, see what to add | Works: wheel or typed readings, strip/drop, doses by product and strength, retest prompt | HEP-10 |
| 9:00 | tech | Checklist, photos, close the job | **Not built** | HEP-11 |
| 10:00 | tech | Measure a liner or cover | Works: Measure, sample pools, closure check, order form | HEP-12 |
| any | everyone | Message board | Works: Messages tab (native board) | HEP-13 |
| any | everyone | Report a problem | Works: More → Report a problem, or Report on Today | HEP-14 |
| 4:00 | office | Chemical log review | **Not built**: readings are saved per pool and day, no review screen | HEP-15 |
| 4:30 | office | Billing and invoicing | **Not built** | HEP-16 |

Customers added with **Add a customer** are real and show no badge. Today's
route is every customer whose service day is today. Anything made up
(the owner's "Try it" customer, **Load demo staff**) is marked DEMO and goes
with More → Remove demo data. There are no forecasts until the forecasting
engine is connected, so readings show without a forecast to compare against.

## Reporting a problem

In the app: **More → Report a problem**. The form asks for:

| Field | Values |
|---|---|
| Feature area | Dispatch · Route View · Tech Field Portal · Chemical Logger · Measure · Invoicing · Other |
| How bad | Blocker (stops the work) · Major (wrong result or a hard workaround) · Minor (annoying, has a workaround) · Idea |
| Device / viewport | Phone · Tablet · Computer (guessed from the screen width) |
| In a few words | the title, 120 characters at most |
| What happened | required |
| What you expected | optional |
| How to make it happen again | optional |

The app also records the screen the tester came from, the browser, who sent it
(from the sign-in) and when.

Reports are kept at `feedback/reports/<id>` in D1 (`apps/api/src/feedback.ts`).
Anyone signed in can read and add to a report; only an owner can replace or
delete one, or change its status or Linear link (the Worker drops those from
anyone else).

After sending, the app shows **Open in Linear**: Linear's new-issue page in
the team, already filled in, which the tester files under their own Linear
sign-in by tapping Create. The Worker holds no Linear key and never files
anything itself. The page is filled with:

- title `[<Feature area>] <In a few words>`
- priority: Blocker → Urgent, Major → High, Minor → Medium, Idea → Low
- project **CCS Pools test drive**, label **Tester report** (from `brands/ccs-pools/brand.json`)
- the description lists the fields in the order above

An owner can record the issue id (for example HEP-21) and link on the report;
it then shows in the app's report list.
