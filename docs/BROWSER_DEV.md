# Browser dev — agent flow

How to drive local Discord theme changes in Chrome via the chrome-devtools MCP.

## Setup

1. **Dev server** (background): `npm run serve`. Listens on `http://127.0.0.1:8765`, watches the configured theme source and base file, and normally rebuilds within a second.
   - `GET /theme.css` — current combined theme
   - `GET /version` — `{ version }` stamp, bumps every rebuild
   - `GET /inject.js` — loader
   - `.theme-dev/apply.js` — self-contained loader with the current CSS embedded, rewritten on every rebuild (gitignored)

   Run it as a long-lived process and keep its process/session handle. Do **not** append a shell `&`, which can detach the server while making the command appear finished. Confirm it is up by `curl`ing `/version`.

2. **Open Discord**: `new_page url=https://discord.com/app` (or reuse via `list_pages`).

3. **Inject** with `evaluate_script` and `sourcePath` set to the absolute path of `.theme-dev/apply.js`. It applies the theme without any page-to-localhost request, installs `window.__themeDev`, and returns `status()`. It does not auto-reload: **re-run it after every edit** (the server keeps the file current).

   The fetch-based loader is for humans pasting into DevTools, where it auto-reloads on every rebuild:

   ```js
   fetch('http://127.0.0.1:8765/inject.js').then(r => r.text()).then(eval)
   ```

   Agents should not use it: Chrome can hold the page's request to `127.0.0.1` behind a local-network-access permission prompt, which hangs `evaluate_script` until it times out. Its fetches now fail after 3s with a pointer back here.

4. **Re-inject after navigation.** A full navigation or reload wipes the injected style. After `navigate_page`, check `window.__themeDev`; if it is missing, run step 3 again.

Keep `evaluate_script` calls short. Don't `await` long waits or network work inside them; the call has a protocol timeout. Pass `waitForStableDom: false` for read-only measurements.

## Helpers (`window.__themeDev`)

- `status()` — injection mode (`embedded`/`server`), version, and whether the style is present.
- `compare(selector, props?)` — computed styles and box (`rect`: left top width height) of the first five matches with the theme **on vs. off**, returning only what differs. The fastest way to see what the theme changed and how unthemed Discord lays something out. Transitions are frozen while measuring.
- `discordRules(selector, prop)` — rules from Discord's own stylesheets (not the theme) that set `prop` on the first match. Shows what Discord intends, e.g. `background-color: var(--white)` or a width that depends on a Discord variable.
- `placeholders(limit = 50)` — visible elements painted with a placeholder color (see below), with the property and color name.
- `computed(selector)` — curated computed styles for the first match.
- `find(text)` — elements that directly own matching text nodes (case-insensitive; not visibility-filtered).
- `cssVar(name)` — resolve a theme variable (`--bg-4`, `bg-4`).
- `trace(selector, prop = 'background-color')` — best-effort trace of the `var()` chain behind a property, including candidate source stylesheet and `!important` status. It does not fully model cascade and inheritance (specificity, layers, inline styles, or container-query state), so confirm the result with computed styles or DevTools before editing.
- `reload()` / `off()` / `start()` / `stop()` — re-apply, remove, or toggle polling (server mode only).

For automatic installation during interactive browser work, import `scripts/theme-dev.user.js` into a userscript manager.

## Fixing a visual bug

1. **Say what's wrong before editing.** If the report is only a screenshot, state your reading of the bug and confirm it against the live UI. A plausible-looking guess is often the wrong bug.
2. **Compare against unthemed Discord.** `compare()` on the broken element and its container usually shows the cause directly. Most theme bugs are either a dead selector or the theme overriding something Discord's layout relies on.
3. **Read Discord's own rule** with `discordRules()` before overriding it. Prefer working with the variable or mechanism Discord uses over adding a new override.
4. **Check selectors** with `npm run check-classes`. A rule that silently stopped matching is a renamed or removed class: update the existing rule instead of adding a new one next to it.
5. **Verify with numbers.** Measure positions, centers, and computed colors after the fix rather than eyeballing a screenshot; a 4px offset is easy to miss by eye.

**Placeholder colors.** The color mapping assigns pure `lime`, `magenta`, `yellow`, `blue` and `red` to Discord variables that haven't been found in the UI yet. If one shows up on screen (or in `placeholders()`), that variable is now in use and needs a real mapping; use `trace()` to find which one.

**Plugin UI.** Vencord plugin UI (e.g. the Spotify controls, `#vc-*` / `.vc-*`) doesn't exist in browser Discord. Vencord's own plugin CSS ships with the desktop client (in Vesktop: `vencordFiles/vencordDesktopRenderer.css` under the app's data directory) and is the reference for what a plugin rule fights against.

## Transient-state UIs (uploads, hovers, drag previews)

States that disappear on their own are awkward to iterate against—by the time you've taken a screenshot and changed CSS, the element may be gone.

- **Author's workflow** (interactive): trigger the state, then press **F8** (or `Cmd-\`) in DevTools to pause JavaScript. The DOM and CSS stay editable in Elements; resume with F8 when done.
- **Agent workflow**: for a variable-only fix, use `cssVar()` (or `trace()` on `:root`/`body`) as a sanity check after the transient element disappears. This confirms the token's value, not that the component consumes it. For component-level verification, throttle the network (`emulate networkConditions=Slow 3G`) or capture the relevant computed values in one `evaluate_script` call while the element is visible.
- For uploads specifically: fixtures must live under the workspace root (`/tmp` is rejected by `upload_file`). Use a small fixture (≤8 MB) to avoid upload-limit UI interfering with the test.

## Verifying changes

Mechanical edits (placeholder swap, typo, class rename confirmed by `npm run check-classes`): edit and stop.

Anything that changes rendering—messages, codeblocks, embeds, mentions, or specificity-sensitive selectors—verify in real Discord UI. Synthetic fragments miss real class names and cascade; "fixed" in isolation can still be broken in production.

Discord's browser CSP may block third-party fonts or images referenced by the theme. Browser verification is authoritative for Discord DOM, cascade, layout, and colors; verify blocked external assets separately in the desktop client. Check the console before treating an absent font or image as a CSS regression.

Preferred test channel (requires access): <https://discord.com/channels/730984700658581574/730984700658581577>. `navigate_page` there, re-inject, post/find content that exercises the case, and screenshot before/after. If it is unavailable, use another channel explicitly designated for testing.

Synthetic fragments are fine only for sanity-checking that a CSS variable resolves.
