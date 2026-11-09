# Componentia Cybernetical (vendored)

The component library the web app wears (DECISIONS d0039). Copied byte for
byte; do not edit. To update, copy the new files from the source and change
the hashes and version here.

| | |
|---|---|
| Source | claude.ai Design System artifact "The Componentia Cybernetical" |
| Slug | `2c7e763f-ac91-4894-b882-c0f9a974e343` |
| Version | `1794238376-fc61` |
| `bundle.js` sha256 | `0e37374188c6deae9a2ce04faff462bba7c955cf97f6e191cc08585d171f3423` |
| `bundle.css` sha256 | `ca1941c173ea3fa428e9997341965f9112370ea46e38207819e247d790ac12c1` |
| `tokens.css` sha256 | `53774f9e57c7ef37b0333a0246ef1b893f2199ffb6bc391271a1eabc82b57323` |

- `bundle.js`: React components as one script. It reads `window.React` when it
  runs and sets `window.Componentia.<Name>`. `src/lib/app/componentia.ts` sets
  `window.React` first, then loads it.
- `bundle.css`: the component classes (`.cz-*`) and each theme's shape layer
  (fonts, radii, border widths) under `[data-theme="<id>"]`.
- `tokens.css`: colour roles, spacing and shadows for the three themes the app
  ships (`poolos`, `bluedevil`, `smpools`), generated from the library's
  `tokens.json`.
- `bundle.d.ts` is ours, not the library's: it stops TypeScript type-checking
  `bundle.js` (`checkJs` is on in `tsconfig.app.json`).

Check the copy: `sha256sum apps/web/src/vendor/componentia/*.js apps/web/src/vendor/componentia/*.css`.
