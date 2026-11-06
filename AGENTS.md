# system24

A TUI-style CSS theme for Discord built on top of [midnight](https://github.com/refact0r/midnight-discord). It is not a standalone theme: `src/main.css` imports midnight's published build, then System24 adds its own defaults and overrides. The maintainer may be running it through desktop Vencord/BetterDiscord (`npm run dev` + `DEV_OUTPUT_PATH`), testing in a browser tab (`npm run serve`), or having an agent drive their Vesktop over CDP (`scripts/cdp.mjs`). Most of the time you can just edit files; only spin up a live flow (desktop or browser) when told.

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
- `scripts/cdp.mjs` + `scripts/dom.js` — desktop dev flow: drives the maintainer's running Vesktop over CDP.
- `scripts/screenshot-flavors.js` — captures flavor screenshots into `assets/flavors/` (plus README thumbnails in `assets/flavors/thumbs/`) by cycling each flavor through the live Vesktop theme file (`npm run screenshot`, macOS only, requires `DEV_OUTPUT_PATH`).
- `scripts/check-classes.js` — lists Discord classes in `src/*.css` that no longer exist in the current client, with file, line, and same-name candidates (`npm run check-classes`; checks Discord Stable by default, `-- --canary` for Canary; data from a mirror of itmesarah/DiscordClasses, cached in `.theme-dev/`).
- `docs/BROWSER_DEV.md` — browser injection and verification flow.
- `docs/DESKTOP_DEV.md` — desktop (Vesktop over CDP) injection and verification flow.

## System24 vs. midnight

- Put TUI-specific presentation here: ASCII treatments, panel labels, unrounding, System24 defaults, and deliberate overrides of midnight.
- Put shared Discord structure and design-system mappings in midnight: app chrome, chatbar, top bar, profiles, modals, shared colors, and other behavior System24 inherits unchanged.
- System24 development assumes the published midnight import is working. Fix and verify upstream problems in midnight first, then return here to test the System24 layer.

## Hard rules

- Edit `src/*.css`, never `build/system24.css`. Run `npm run dev` to regenerate the committed build.
- When adding or removing a source file, update the ordered `sourceFiles` list in `scripts/theme.config.js`; builds fail on an unlisted or missing CSS file.
- Public defaults are duplicated in `src/main.css` and `theme/system24.theme.css`; keep them in sync. When adding or renaming public variables, also update every affected standalone flavor while preserving flavor-specific values.
- `npm run dev` requires `DEV_OUTPUT_PATH` in `.env` (comma-separated paths are supported). `npm run build` and `npm run serve` do not.
- `scripts/build.js`, `dev.js`, `serve.js`, `inject.js`, `check-classes.js`, `screenshot-flavors.js`, `theme-dev.user.js`, `cdp.mjs`, `dom.js`, `docs/BROWSER_DEV.md`, and `docs/DESKTOP_DEV.md` are intentionally identical to midnight's copies. Keep theme-specific behavior in `scripts/theme.config.js` and theme ownership guidance in `AGENTS.md`.
- Don't add `!important` merely to fight specificity—tighten the selector first.
- After adding or changing Discord class selectors, run `npm run check-classes`. It checks this repo's `src/` only; midnight's selectors are checked in midnight.

## Layout traps

- Virtualized lists (channel list, member list, DM list, friends list, messages) place rows at the heights Discord's JS assumes. Changing a row's height desyncs scrolling: rows render off screen or leave gaps. Restyle within the row's box; to make rows shorter or taller, `zoom` the scroller (its scrollTop, clientHeight and spacers all live inside the zoom, so the maths holds) and zoom each row's contents back. Check by scrolling: rows contiguous and filling the viewport at a few offsets.
- Some sizes are set in JS and ignore CSS variables: server icons (40px) and folder buttons (48px), open folders' server lists (48px per server), member rows (42px, group headers 38px), DM rows (44px; 40 in compact density, 50 in cozy), friends rows (61px, section titles 50px). Shrink them visually (`zoom`, `transform: scale`) instead of resizing them.

## Experimental agentic development

Two ways to read Discord's live HTML/CSS and check changes, each only when the maintainer says to use it:

- **Desktop** ([`docs/DESKTOP_DEV.md`](./docs/DESKTOP_DEV.md)): the maintainer's own Vesktop, driven over CDP with `scripts/cdp.mjs`. It's the real client, with plugin UI and the theme's fonts, but it is their Discord and they may be using it: by default apply, read what is on screen, and ask them to verify. It also covers launching Vesktop with the debug port and several agents sharing one Vesktop.
- **Browser** ([`docs/BROWSER_DEV.md`](./docs/BROWSER_DEV.md)): a Discord tab driven through the chrome-devtools MCP. It covers local injection, transient UI states, and verification against real Discord rather than synthetic DOM fragments.

The dependency ownership rules remain in this file. For any visual bug, follow the "Fixing a visual bug" steps in `docs/BROWSER_DEV.md` (they apply to both flows): compare against unthemed Discord, and check whether the cause is in midnight before editing here.
