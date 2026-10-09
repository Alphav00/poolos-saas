# Deploying PoolOS

PoolOS runs as one Cloudflare Worker at **https://poolos.pathofphi.com**.
Cloudflare Access sits in front of it, so nobody reaches the app without
signing in. The Worker also checks Access's signed token on every request.

## What already exists in the Cloudflare account (Path of Phi)

| Thing | Name | Created |
|---|---|---|
| D1 database | `poolos` (`ff199d7f-…`) | 2026-10-06 |
| R2 bucket | `poolos-files` | 2026-10-06 |
| Access application | PoolOS (poolos.pathofphi.com), policy "PoolOS team" | 2026-10-06 |

## One-time: let GitHub deploy

1. Cloudflare dashboard → My Profile → API Tokens → Create Token →
   "Edit Cloudflare Workers" template. Add **Account → D1 → Edit**. Under
   Zone Resources pick **pathofphi.com**. Create it.
2. GitHub → Alphav00/poolos-saas → Settings → Secrets and variables →
   Actions → New repository secret: name `CLOUDFLARE_API_TOKEN`, paste the
   token. Never paste it anywhere else.
3. Actions → Deploy → Run workflow (or merge to main).

Expected: the workflow ends with `home without sign-in: 302`. Opening
https://poolos.pathofphi.com shows the Cloudflare Access sign-in page.
If it fails at "Apply database migrations" with an authentication error,
the token is missing D1 Edit. If it fails at "Deploy the Worker" mentioning
routes or DNS, the token is missing the pathofphi.com zone.

## Preview: try a branch before it merges

Every pull request from a branch in this repo is deployed by
`.github/workflows/preview.yml` to **https://poolos-preview.pathofphi.com**.
The live site is not touched.

| | Live | Preview |
|---|---|---|
| Worker | `poolos-api` | `poolos-preview` |
| Address | poolos.pathofphi.com | poolos-preview.pathofphi.com |
| D1 database | `poolos` | `poolos-preview` (own data, starts empty) |
| R2 bucket | `poolos-files` | `poolos-files` (shared; the app does not use it yet) |
| Deployed by | push to `main` (deploy.yml) | pull request push (preview.yml) |
| Brand pack | `ccs-pools` | `ccs-pools` |

The settings are `env.preview` in `apps/api/wrangler.jsonc`. There is one
preview: the last pushed pull request wins.

**One-time, in the Zero Trust dashboard:** Access → Applications → PoolOS →
Configure → add the domain `poolos-preview.pathofphi.com`. Same policy, same
email list. Until then the preview answers "Sign in required" to everyone
and the workflow ends with a warning instead of failing.

Problem reports are filed in Linear by the tester from the app, under their
own Linear sign-in; neither Worker holds a Linear key.

To remove the preview: delete the `poolos-preview` Worker and the
`poolos-preview` D1 database in the dashboard, then the certificate for
poolos-preview.pathofphi.com under SSL/TLS → Edge Certificates.

## Letting colleagues in

Zero Trust dashboard → Access → Applications → PoolOS → Policies →
"PoolOS team" → add each colleague's email under Include → Emails. They
sign in with a one-time code sent to that email, or Google.

Owners (who can open owner-only boards and import data) are listed in
`OWNER_EMAILS` in `apps/api/wrangler.jsonc`.

## Board access

Each board in `apps/api/src/boards.ts` is `owner` (owners only) or `team`
(everyone Access lets in). Owner-only boards are refused, page and data,
to anyone else.

## Bringing board data over from the Claude artifacts

Sign in as an owner, then on the home page use **Import data from an
export file** under each board. An export file looks like
`{"collections": {"cards": {"<id>": {...}}, "log": {...}}}`. Importing
overwrites documents with the same id and leaves others alone.
