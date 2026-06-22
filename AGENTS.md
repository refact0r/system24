# system24

A TUI-style CSS theme for Discord built on top of [midnight](https://github.com/refact0r/midnight-discord). It is not a standalone theme: `src/main.css` imports midnight's published build, then System24 adds its own defaults and overrides. The maintainer may be running it through desktop Vencord/BetterDiscord (`npm run dev` + `DEV_OUTPUT_PATH`) or testing in a browser tab (`npm run serve`). Most of the time you can just edit files; only spin up the browser flow when told.

## Layout

- `src/*.css` — System24 source, layered after midnight:
  - `main.css` — midnight import, fonts, public defaults, palette, and the small set of general System24 overrides.
  - `ascii.css` — ASCII channel titles and loading screens.
  - `colors.css` — System24-specific status-color aliases. Most shared Discord color mapping lives upstream in midnight.
  - `panel-labels.css` — optional labels around major panels.
  - `spotify-bar.css` — optional text-style Vencord Spotify progress bar.
  - `unrounding.css` — square corners, avatars, and status indicators.
- `theme/system24.theme.css` — main user-facing theme file and public variables.
- `theme/flavors/` — standalone palette variants that import the same System24 build.
- `build/system24.css` — generated from `src/*.css` by the build tooling, committed to git, and imported by user theme files. **Don't hand-edit.**
- `scripts/theme.config.js` — System24-specific paths, import, name, and explicit source order used by the shared dev tooling.
- `scripts/build.js` — deterministic compiler (`npm run build`); `dev.js` and `serve.js` both use it.
- `scripts/dev.js` — rebuilds `build/system24.css`, expands the build import into each `DEV_OUTPUT_PATH`, and watches `src/` plus `theme/system24.theme.css`.
- `scripts/serve.js` + `scripts/inject.js` + `scripts/theme-dev.user.js` — browser dev flow (`npm run serve`).
- `docs/BROWSER_DEV.md` — browser injection and verification flow.

## System24 vs. midnight

- Put TUI-specific presentation here: ASCII treatments, panel labels, unrounding, System24 defaults, and deliberate overrides of midnight.
- Put shared Discord structure and design-system mappings in midnight: app chrome, chatbar, top bar, profiles, modals, shared colors, and other behavior System24 inherits unchanged.
- System24 development assumes the published midnight import is working. Fix and verify upstream problems in midnight first, then return here to test the System24 layer.

## Hard rules

- Edit `src/*.css`, never `build/system24.css`. Run `npm run dev` to regenerate the committed build.
- When adding or removing a source file, update the ordered `sourceFiles` list in `scripts/theme.config.js`; builds fail on an unlisted or missing CSS file.
- Public defaults are duplicated in `src/main.css` and `theme/system24.theme.css`; keep them in sync. When adding or renaming public variables, also update every affected standalone flavor while preserving flavor-specific values.
- `npm run dev` requires `DEV_OUTPUT_PATH` in `.env` (comma-separated paths are supported). `npm run build` and `npm run serve` do not.
- `scripts/build.js`, `dev.js`, `serve.js`, `inject.js`, `theme-dev.user.js`, and `docs/BROWSER_DEV.md` are intentionally identical to midnight's copies. Keep theme-specific behavior in `scripts/theme.config.js` and theme ownership guidance in `AGENTS.md`.
- Don't add `!important` merely to fight specificity—tighten the selector first.

## Experimental agentic development

If you're driving Discord through the chrome-devtools MCP to access Discord HTML/CSS or verify changes visually, see [`docs/BROWSER_DEV.md`](./docs/BROWSER_DEV.md). It covers local injection, transient UI states, and verification against real Discord rather than synthetic DOM fragments. The dependency ownership rules remain in this file.
