# Brand packs

One folder per company that runs the app. The build picks one with
`BRAND=<folder>` (default `poolos`). Nothing else in the code names a company:
screens read `virtual:brand`, colours come from `--brand-*` CSS variables, and
images are served at `/brand/<file>`.

```bash
pnpm build                     # brands/poolos
BRAND=ccs-pools pnpm build     # brands/ccs-pools (what deploy.yml ships)
```

This is not a white-label product. A pack lets a company trying the app see
it with its own name, logo and colours while it tests.

## What a pack holds

| File | Used for |
|---|---|
| `brand.json` | name, short name (home-screen label), legal name, tagline, `pilot`, colours |
| `logo.png` | full logo, transparent, square, 512 px: top of the Today screen |
| `mark.png` | logo without words, transparent, 256 px: Measure header |
| `favicon.png` | 64 px browser tab icon |
| `icon-192.png`, `icon-512.png` | installed-app icons, opaque |
| `icon-maskable-512.png` | Android adaptive icon: logo inside the middle 80% |
| `apple-touch-icon.png` | 180 px iPhone home-screen icon, opaque |

`pilot: true` shows the "You're test-driving the app" card and the Report
button on Today.

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
