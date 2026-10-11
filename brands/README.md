# Brand packs

One folder per company that runs the app. The build picks one with
`BRAND=<folder>` (default `poolos`). Nothing else in the code names a company:
screens read `virtual:brand`, colours come from `--brand-*` CSS variables, and
images are served at `/brand/<file>`.

```bash
pnpm build                               # brands/poolos
BRAND=ccs-pools pnpm build               # brands/ccs-pools only
BRAND=ccs-pools,sm-pools pnpm build      # both, with a sign-in (what deploy.yml ships)
```

## Several packs and the placeholder sign-in

With more than one pack in `BRAND` the first is the default, and the app opens
on a sign-in screen. The usernames are placeholders: each pack's folder name
(`sm-pools`), or its name (`S&M Pools`). Signing in sets
`<html data-brand="<id>">`, which switches the `--brand-*` colours, and the
screens read that pack's name, logo and tagline. The choice is saved in the
browser (`localStorage`, key `poolos.account`); More → Account signs out.
Measure wears the same pack. Cloudflare Access still decides who gets in; the
username only picks the company. Each pack's images are also served at
`/brand/<id>/<file>`. The manifest, favicon and home-screen icon are static, so
they stay the default pack's.

Each company has its own team data. Signing in also sets the `poolos_company`
cookie, and the Worker keeps the team boards (staff, pools, readings,
messages, problem reports) per company as `<board>@<id>` in D1
(`apps/api/src/company.ts`). The default pack sets no cookie and keeps the
plain boards, so the data that was there before stays with it. A new company
starts empty: an owner loads its demo pools and adds its staff. Measure jobs
are kept per company too (`measure_jobs.company`). Owner boards are shared.

Who may open which company comes from the staff lists (`COMPANY_LOCK: "staff"`
in `apps/api/wrangler.jsonc`, DECISIONS d0023). An owner (`OWNER_EMAILS`)
may open any company. Everyone else may open only a company whose Staff screen
lists their email, and the Worker refuses the rest with 403. On opening, the
app asks `/api/me` which companies that is. With one, it goes straight in.
With several, it asks which (More → Switch company changes it later). With
none, it says to ask the owner. So before a tester's first visit, the owner
adds their email on that company's Staff screen.

This is not a white-label product. A pack lets a company trying the app see
it with its own name, logo and colours while it tests.

## What a pack holds

| File | Used for |
|---|---|
| `brand.json` | name, short name (home-screen label), legal name, tagline, `pilot`, `linear`, colours |
| `logo.png` | full logo, transparent, square, 512 px: top of the Today screen |
| `mark.png` | logo without words, transparent, 256 px: Measure header |
| `favicon.png` | 64 px browser tab icon |
| `icon-192.png`, `icon-512.png` | installed-app icons, opaque |
| `icon-maskable-512.png` | Android adaptive icon: logo inside the middle 80% |
| `apple-touch-icon.png` | 180 px iPhone home-screen icon, opaque |

`loader` (optional) is the company's loading screen after sign-in: up to 8
`balls` (hex colours) spiral in and merge as a count runs to 100%, over the
`deep` colour, with `word` underneath:
`{ "balls": ["#f60882", "#1896fa"], "word": "Filling the pool" }`.
Without it the app loads with no loading screen.

`pilot: true` shows the "You're test-driving the app" card and the Report
button on Today.

`linear` (optional) says where the tester's problem reports go in Linear:
`{ "team": "HEP", "project": "CCS Pools test drive", "labels": ["Tester report"] }`.
The team is the Linear team key; project and labels are names as they appear
in Linear. After saving a report, the app offers **Open in Linear**: Linear's
new-issue page, filled in, which the tester files under their own Linear
sign-in. Without `linear` the button is not shown. Nothing here is a secret.

### Colour scheme and surfaces

`scheme` is `"light"` (default) or `"dark"`. It sets `color-scheme`, which picks
the light or dark status colours (ok, warning, problem). A dark pack also sets
its surfaces in `colors`; any it leaves out fall back to the light ones:

| Key | Where it shows |
|---|---|
| `card` | cards, sheets, the tab bar, inputs |
| `mute` | secondary text |
| `line` | dividers, input borders |
| `soft` | quiet panels inside cards |
| `title` | the company name on Today (default: `deep`) |

### Colours (`brand.json` → CSS variable)

| Key | Variable | Where it shows |
|---|---|---|
| `primary` / `primaryDark` | `--brand-primary`, `--brand-primary-dark` | button gradient |
| `deep` | `--brand-deep` | button shadow, company name |
| `link` | `--brand-link` | links, selected tab, numbers; keep it dark enough to read on white in sun |
| `sky` | `--brand-sky` | route line, charts, picked wheel wedge |
| `ice` | `--brand-ice` | chips, selected tab background |
| `accent` | `--brand-accent` | the pilot card's Report button |
| `ink` | `--brand-ink` | body text |
| `surface` / `background` | `--brand-surface`, `--brand-background` | page gradient, theme colour |

Each also comes as `--brand-<key>-rgb` ("r g b") for Tailwind's `/opacity`
syntax in Measure.

`brands/vite-plugin-brand.mjs` checks the pack at build time and stops the
build with the missing file or key.

## ccs-pools

From the logo CCS Pools supplied on 2026-10-09: navy `#0e3c5f`, pool blue
`#139ad1`, aqua `#28a5d5`, duck yellow `#fad321`. The logo's black background
and the image generator's corner sparkle were removed; the artwork is
otherwise unchanged. Tests and fixtures still may not name the company
(`tests/denylist.txt`).

## sm-pools

From the S&M Pools design system (claude.ai Design System artifact, and the
"S&M Pools Design System" folder on Chi's Google Drive, 2026-10-10). Colours are
its dark ("night pool") tokens, at Chi's pick on 2026-10-10 that white
clashed: surface-100 `#121022` for the page, surface-200 `#1c1932` for cards,
ink `#f4f3fb`, ink-muted `#b7b4cc`, hairline `#34304f` for lines and chips,
link `#a99bff`, lane-navy dark `#5b3fe0` for buttons (flat, since the system
uses no gradients, so `primary` and `primaryDark` match; white text 6.5:1),
lane-navy `#2e0997` behind the loading screen, sky `#1896fa`, and sun-yellow
`#fade18` for the Report button. The loader is the
design system's goo loader in the six logo-bubble colours. The logos are the design
system's `sm-pools-logo-transparent.png` (logo, mark, favicon) and
`sm-pools-logo.png` on white (app icons; maskable inside the middle 80%).
Both are rasters cut from the 2026 flyer: swap in the owners' originals when
they arrive, without redrawing. Tests and fixtures may not name the company
(`tests/denylist.txt`).
