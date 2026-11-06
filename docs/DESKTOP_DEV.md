# Desktop dev — agent flow

How to drive local theme changes in the maintainer's desktop client (Vesktop) over the Chrome DevTools Protocol.
Unlike the browser flow (`docs/BROWSER_DEV.md`), this is the client the theme ships to: Vencord plugin UI exists,
the theme's fonts and images load, and the window chrome (title bar, macOS traffic lights) is real. The catch is
that it is the maintainer's own Discord, which they may be using while you work; see "Working in the maintainer's
client" before touching it.

The `window.__themeDev` helpers and the "Fixing a visual bug" method in `docs/BROWSER_DEV.md` apply here too.

## Setup

1. **Vesktop with a debug port.** Vesktop has to be running with `--remote-debugging-port=9229`. Check with
   `curl -s http://127.0.0.1:9229/json/list`, which should list a page whose URL contains `discord.com`. If it
   doesn't, Vesktop has to be restarted, which closes the maintainer's Discord: ask first, then

   ```bash
   osascript -e 'quit app "Vesktop"'
   open -a Vesktop --args --remote-debugging-port=9229
   ```

   `open --args` is silently ignored while Vesktop is still running, quitting or starting, so make sure it has
   quit before relaunching and check the port again afterwards. `CDP_PORT` overrides 9229.

2. **`DEV_OUTPUT_PATH`** in `.env`, as for `npm run dev`. Optional: without it, `apply` only injects.

## `scripts/cdp.mjs`

```bash
node scripts/cdp.mjs apply                          # build, write DEV_OUTPUT_PATH, inject (replaces the previous injection)
node scripts/cdp.mjs eval '<js>'                    # evaluate in Discord, awaits promises, prints JSON
node scripts/cdp.mjs eval "$(node scripts/dom.js '<selector>' 10 80)"   # compact DOM tree with boxes (max depth, max lines)
node scripts/cdp.mjs shot .theme-dev/x.png          # whole window, downscaled to 1400px wide
node scripts/cdp.mjs shot .theme-dev/x.png '<selector>' --pad 8 --width 900   # one element's box
node scripts/cdp.mjs shot .theme-dev/x.png --clip x,y,w,h --hover '<selector>'   # CSS-px region, :hover forced
node scripts/cdp.mjs nav /channels/@me              # client-side navigation (the injection survives)
node scripts/cdp.mjs click '<selector>'             # element.click() on the first match
node scripts/cdp.mjs hover '<selector>'             # real mouse move to the element's centre
node scripts/cdp.mjs mouse '<selector>' [right]     # real press and release (right opens context menus)
node scripts/cdp.mjs key Escape                     # key press to the page
```

- `apply` builds with `scripts/build.js` and injects through `scripts/inject.js` in embedded mode, so
  `window.__themeDev` is installed afterwards. It also writes the build to every `DEV_OUTPUT_PATH`: Vencord loads
  the installed theme after the injected style, so a stale installed copy would win ties. The write is atomic,
  which Vencord's watcher hot-reloads, and the change persists across restarts. Without the debug port it still
  builds and writes, and says nothing was injected.
- The injection survives client-side navigation (`nav`, clicking around) but not a reload: `apply` again after one.
- Measure in a separate `eval` from the `apply`. In the same breath, the layout can still be the old one.
- Selectors, boxes and `--clip` are in CSS px. Vesktop's zoom is the maintainer's setting; `shot`, `hover` and
  `mouse` convert for it.
- `shot` needs macOS `sips` and ImageMagick (`magick`). `nav` uses Vencord's router.

## Working in the maintainer's client

The window is the maintainer's real Discord, and they may be using it right now.

- **Default: apply, read, ask.** `apply`, read the DOM and computed styles of what is already on screen (`eval`,
  `dom.js`, `__themeDev`), then say what changed and what to look at, and ask the maintainer to check it (or to
  open the state you need to measure). Don't run visual checks of your own (screenshot passes, navigating away,
  opening menus or test UI, forced hovers, waiting for them to go idle) unless they ask.
- When they do ask you to drive it: close what you open (`key Escape`), and never send messages, change settings
  or click destructive actions.
- Measuring still beats eyeballing: check positions and colours on what is on screen with `eval` after a fix.

## Several agents at once

- One Vesktop serves every agent and every theme repo, and all of them inject into the same style element: the
  last `apply` wins, whichever repo or agent ran it. If the maintainer doesn't see your change, check whether
  someone else applied after you, and re-apply only if they agree.
- `build/` is generated from the working tree, which may hold another agent's unfinished `src/` edits. When
  committing, make sure the commit, and the `build/` regenerated for it, contains only your own changes.
