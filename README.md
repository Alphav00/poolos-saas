# PoolOS

Software for pool service companies. Read [docs/DESIGN.md](docs/DESIGN.md)
before writing any code. It holds the constraints, the milestones and the
open decisions.

## Layout

```
apps/api/       Cloudflare Worker (D1 + R2 bindings). All phone writes go through it.
apps/web/       Svelte + Vite + Tailwind front end
docs/DESIGN.md  The design document (append-only)
inputs/         Files Chi supplies for a milestone. Git-ignored.
reference/      Earlier work kept for reference. Not built or tested.
scripts/        Fixture lint and its self-test
tests/          denylist.txt for the fixture lint
```

## One command

```bash
pnpm install
pnpm check      # lint, typecheck, fixture lint, all tests
```

Expected: every step ends without `ERR` and the last lines read
`fixture-lint self-test: OK`. A denylisted string in a test or fixture makes
`pnpm fixture-lint` fail and print `path:line: contains "<term>"`.
