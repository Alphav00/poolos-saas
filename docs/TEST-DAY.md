# Test day

How a company trying the app runs a normal day on it, and where problems go.
The live site wears the tester's brand pack (`brands/README.md`). The steps
are also Linear issues in the PoolOS team, project **CCS Pools test drive**:
parent [HEP-1](https://linear.app/holoeyes/issue/HEP-1), one sub-issue per step.

## Before the tester signs in (Chi)

1. Add each tester's email to the Cloudflare Access policy for
   poolos.pathofphi.com. Nobody gets in without it.
2. Optional: let reports open Linear issues on their own.
   `cd apps/api && pnpm exec wrangler secret put LINEAR_API_KEY` with a
   Linear personal API key (Settings → Security & access). Team, project and
   label ids are already in `wrangler.jsonc`. Without the key, reports are
   kept in D1 and listed in the app; nothing is lost.
3. Optional: invite the tester to the Linear workspace so they can tick off
   the test tasks themselves. Otherwise they work from the app alone and
   Chi moves the issues.

## The day

| Time | Who | Step | In the app today | Linear |
|---|---|---|---|---|
| 6:45 | everyone | Put the app on the phone | Works: Add to Home Screen; icon and name come from the brand pack | HEP-2 |
| 7:00 | office | Morning check | Works: weather, today's route summary, who is working (DEMO) | HEP-3 |
| 7:15 | office | Chemicals and target ranges | Works: More → Chemistry setup | HEP-4 |
| 7:30 | office | Schedule cleanings and repairs, assign techs | **Not built** | HEP-5 |
| 7:45 | office | Route order and optimisation | **Not built**: fixed demo order | HEP-6 |
| 8:00 | tech | Clock in | **Not built** | HEP-7 |
| 8:15 | tech | Walk the route | Works: Route tab, flags, truck load (DEMO) | HEP-8 |
| 8:30 | tech | Pool profile | Works: tags, equipment, decay chart. Missing: gate code, access notes, customer contact | HEP-9 |
| 8:40 | tech | Test, log readings, see what to add | Works: wheel or typed readings, strip/drop, doses by product and strength, retest prompt | HEP-10 |
| 9:00 | tech | Checklist, photos, close the job | **Not built** | HEP-11 |
| 10:00 | tech | Measure a liner or cover | Works: Measure, sample pools, closure check, order form | HEP-12 |
| any | everyone | Message board | Works: Messages tab | HEP-13 |
| any | everyone | Report a problem | Works: More → Report a problem, or Report on Today | HEP-14 |
| 4:00 | office | Chemical log review | **Not built**: readings are saved per pool and day, no review screen | HEP-15 |
| 4:30 | office | Billing and invoicing | **Not built** | HEP-16 |

Pools and crew on the route are made-up demo data (`apps/web/src/lib/field/sample.ts`),
marked DEMO on every screen that shows them. Real customers wait for the
customer list (DESIGN.md §7, §10).

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
delete one. With `LINEAR_API_KEY` set, each new report becomes a Linear issue:

- title `[<Feature area>] <In a few words>`
- priority: Blocker → Urgent, Major → High, Minor → Medium, Idea → Low
- project **CCS Pools test drive**, label **Tester report**
- the description lists the fields in the order above

The issue id (for example HEP-21) is saved on the report and shown in the app.
