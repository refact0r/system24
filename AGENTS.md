# system24

A CSS theme for Discord. May be running through desktop Vencord/BetterDiscord (`npm run dev` + `DEV_OUTPUT_PATH`) or testing in a browser tab (`npm run serve`). Most of the time you can just edit files; only spin up the browser injection flow when told.

## Layout

- `src/*.css` — theme source, split by area. Index:
  - `main.css` — structural rules for app chrome (sidebar, members list, profiles, modals, settings, etc.). The big one after `colors.css`.
  - `colors.css` — overrides of Discord's `--*` design-system variables, mapped to midnight palette. Most "wrong color" bugs are fixed here.
  - `chatbar.css` — message input area.
  - `top-bar.css` — title bar / window controls region above the app.
  - `animations.css` — transition tokens.
  - `background-image.css`, `transparency-blur.css` — toggleable visual effects.
  - `dms-button.css`, `user-panel.css`, `window-controls.css` — small isolated components.
- `themes/midnight.theme.css` — user-facing entry: variables + `@import` of the build.
- `build/midnight.css` — generated from `src/*.css`. **Don't hand-edit. Users import the theme from here.**
- `scripts/dev.js` — watcher for desktop Vencord (`npm run dev`).
- `scripts/serve.js` + `scripts/inject.js` + `scripts/midnight-dev.user.js` — browser dev flow. See `BROWSER_DEV.md`.

## Hard rules

- Edit `src/*.css`, never `build/midnight.css`.
- User-facing CSS variables (colors, sizes, toggles) live in `themes/midnight.theme.css`. Structural rules live in `src/*.css`.
- Don't reach for `!important` to fight specificity — tighten the selector first.

## Agentic development

If you're driving Discord through the chrome-devtools MCP to verify changes visually, see [`BROWSER_DEV.md`](./BROWSER_DEV.md) — specifically the "For AI agents" section. It covers the inject flow, re-injection after navigation, debug helpers, the test server, and the rules for verifying message-rendering changes against real Discord rather than synthetic DOM fragments.
