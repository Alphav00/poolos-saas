# The Diving Board

One platform for everything around a pool: measuring liners and safety covers,
ordering them from the manufacturer, and later service routes, water
chemistry and the homeowner app.

It brings together work that started in separate repos:

| Earlier repo | What it contributes |
|---|---|
| `liner-measure-pro` | A/B measuring math, closure checks, liner takeoff, order-form fields (ported to `packages/measure-core`) |
| `field-chem` | Chemistry calculator (to be rebuilt in `packages/chem`, phase 3) |
| `poolos` | Homeowner app design (phase 5) |

The first users are **liner and cover installers**. See
[docs/ROADMAP.md](docs/ROADMAP.md) for the phases,
[docs/RESEARCH.md](docs/RESEARCH.md) for what goes wrong with existing pool
software, and [docs/DESIGN-RULES.md](docs/DESIGN-RULES.md) for the rules that
prevent those problems here.

## Layout

```
apps/api/               Cloudflare Worker (Hono) + D1 migrations
                        src/measure.ts      server-side closure checks for a saved job
                        src/orderLines.ts   builds order lines from the job's measurement
packages/measure-core/  A/B reconstruction, liner math, closure checks, takeoff
packages/orders/        Supplier registry, order lifecycle, validation, PDF, email
docs/                   Roadmap, research, design rules
```

## Develop

```bash
pnpm install
pnpm test          # every package
pnpm typecheck
```

Run the API locally:

```bash
cd apps/api
pnpm migrate:local
pnpm dev
```

## Deploy (Cloudflare)

1. `wrangler d1 create diving-board` and put the id into `apps/api/wrangler.toml`.
2. `wrangler r2 bucket create diving-board-files`.
3. Put the API behind Cloudflare Access, then set `ACCESS_TEAM_DOMAIN` in
   `wrangler.toml` and `wrangler secret put ACCESS_AUD`.
4. `wrangler d1 migrations apply diving-board --remote`, then `pnpm --filter @diving-board/api deploy`.
5. Add your organisation and users with `apps/api/scripts/seed.sql`.
