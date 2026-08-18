# Browser dev — agent flow

How to drive local Discord theme changes in Chrome via the chrome-devtools MCP.

## Setup

1. **Dev server** (background): `npm run serve`. Listens on `http://127.0.0.1:8765`, watches the configured theme source and base file, and normally rebuilds within a second.
   - `GET /theme.css` — current combined theme
   - `GET /version` — `{ version }` stamp, bumps every rebuild
   - `GET /inject.js` — loader

   Run it as a long-lived process and keep its process/session handle. Do **not** append a shell `&`, which can detach the server while making the command appear finished. Confirm it is up by `curl`ing `/version`.

2. **Open Discord**: `new_page url=https://discord.com/app` (or reuse via `list_pages`).

3. **Install loader**:

   ```js
   await (await fetch('http://127.0.0.1:8765/inject.js')).text().then(eval)
   ```

   Applies the theme, starts ~1s polling against `/version`, and exposes `window.__themeDev`.

4. **Re-inject after navigation.** A full navigation or reload wipes the loader. After `navigate_page`, check `window.__themeDev`; if it is missing, run step 3 again.

## Helpers (`window.__themeDev`)

- `reload()` — force re-fetch + re-apply.
- `off()` — remove injected style + stop polling.
- `start()` / `stop()` — toggle polling.
- `computed(selector)` — curated computed styles for the first match.
- `find(text)` — elements that directly own matching text nodes (case-insensitive; not visibility-filtered).
- `cssVar(name)` — resolve a theme variable (`--bg-4`, `bg-4`).
- `trace(selector, prop = 'background-color')` — best-effort trace of the `var()` chain behind a property, including candidate source stylesheet and `!important` status. It does not fully model cascade and inheritance (specificity, layers, inline styles, or container-query state), so confirm the result with computed styles or DevTools before editing.

For automatic installation during interactive browser work, import `scripts/theme-dev.user.js` into a userscript manager. Agents should normally use the explicit loader step above so setup remains visible in the thread.

## Transient-state UIs (uploads, hovers, drag previews)

States that disappear on their own are awkward to iterate against—by the time you've taken a screenshot and changed CSS, the element may be gone.

- **Author's workflow** (interactive): trigger the state, then press **F8** (or `Cmd-\`) in DevTools to pause JavaScript. The DOM and CSS stay editable in Elements; resume with F8 when done.
- **Agent workflow**: for a variable-only fix, use `cssVar()` (or `trace()` on `:root`/`body`) as a sanity check after the transient element disappears. This confirms the token's value, not that the component consumes it. For component-level verification, throttle the network (`emulate networkConditions=Slow 3G`) or capture the relevant computed values in one `evaluate_script` call while the element is visible.
- For uploads specifically: fixtures must live under the workspace root (`/tmp` is rejected by `upload_file`). Use a small fixture (≤8 MB) to avoid upload-limit UI interfering with the test.

## Verifying changes

Mechanical edits (placeholder swap, typo, rename): edit and stop.

Anything that changes rendering—messages, codeblocks, embeds, mentions, or specificity-sensitive selectors—verify in real Discord UI. Synthetic fragments miss real class names and cascade; "fixed" in isolation can still be broken in production.

Discord's browser CSP may block third-party fonts or images referenced by the theme. Browser verification is authoritative for Discord DOM, cascade, layout, and colors; verify blocked external assets separately in the desktop client. Check the console before treating an absent font or image as a CSS regression.

Preferred test channel (requires access): <https://discord.com/channels/730984700658581574/730984700658581577>. `navigate_page` there, re-inject, post/find content that exercises the case, and screenshot before/after. If it is unavailable, use another channel explicitly designated for testing.

Synthetic fragments are fine only for sanity-checking that a CSS variable resolves.
