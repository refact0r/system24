/* Generic Discord theme browser loader. Runtime values are injected by serve.js.
 * Server mode (runtime.css absent): fetches the theme from the dev server and polls for rebuilds.
 * Embedded mode (runtime.css set): applies the bundled CSS once, no network. Used by .theme-dev/apply.js. */

window.__themeDev?.off?.();

(() => {
    const runtime = __THEME_DEV_RUNTIME__;
    const BASE = runtime.base;
    const DISPLAY_NAME = runtime.displayName;
    const EMBEDDED = typeof runtime.css === 'string';
    const STYLE_ID = 'theme-dev-injected';
    const POLL_MS = 800;
    const FETCH_TIMEOUT_MS = 3000;
    const COMPUTED_PROPS = [
        'color', 'background-color', 'background-image', 'opacity',
        'border', 'border-color', 'border-radius', 'box-shadow',
        'padding', 'margin', 'width', 'height', 'display', 'position',
        'font-family', 'font-size', 'font-weight', 'line-height',
        'transition', 'transform', 'filter', 'backdrop-filter', 'z-index',
    ];

    async function checkedFetch(url) {
        let response;
        try {
            response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        } catch (error) {
            throw new Error(`${error.name === 'TimeoutError' ? 'timed out' : error.message} — ${url}. `
                + 'If the dev server is up, the browser may be blocking local network access; '
                + 'use .theme-dev/apply.js instead (see docs/BROWSER_DEV.md).');
        }
        if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
        return response;
    }

    async function fetchCSS() {
        if (EMBEDDED) return runtime.css;
        return (await checkedFetch(`${BASE}/theme.css?t=${Date.now()}`)).text();
    }

    async function fetchVersion() {
        if (EMBEDDED) return runtime.version;
        return (await (await checkedFetch(`${BASE}/version`)).json()).version;
    }

    async function head() {
        if (!document.head) {
            await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        if (!document.head) throw new Error('document.head is unavailable');
        return document.head;
    }

    async function apply() {
        const css = await fetchCSS();
        let style = document.getElementById(STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            (await head()).appendChild(style);
        }
        style.textContent = css;
        return css.length;
    }

    let lastVersion = null;
    let poller = null;
    let generation = 0;
    let inFlight = null;

    function sync() {
        if (inFlight) return inFlight;
        const request = (async () => {
            const currentVersion = await fetchVersion();
            if (currentVersion === lastVersion) return null;
            const length = await apply();
            const changed = lastVersion !== null;
            lastVersion = currentVersion;
            return { changed, length };
        })();
        inFlight = request;
        request.then(
            () => { if (inFlight === request) inFlight = null; },
            () => { if (inFlight === request) inFlight = null; },
        );
        return inFlight;
    }

    function start() {
        stop();
        if (EMBEDDED) return; // nothing to poll; re-run .theme-dev/apply.js after edits
        const activeGeneration = ++generation;
        const tick = async () => {
            try {
                const result = await sync();
                if (result?.changed) {
                    console.log(`[${DISPLAY_NAME}] reloaded ${result.length}b @ ${new Date().toLocaleTimeString()}`);
                }
            } catch (_) { /* server probably down; keep polling */ }
            if (generation === activeGeneration) poller = setTimeout(tick, POLL_MS);
        };
        tick();
    }

    function stop() {
        generation += 1;
        if (poller) clearTimeout(poller);
        poller = null;
    }

    function off() {
        stop();
        document.getElementById(STYLE_ID)?.remove();
    }

    function computed(selector) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!element) return null;
        const styles = getComputedStyle(element);
        const output = {};
        for (const prop of COMPUTED_PROPS) output[prop] = styles.getPropertyValue(prop).trim();
        output._selector = typeof selector === 'string' ? selector : '<element>';
        output._tag = element.tagName.toLowerCase();
        output._classes = element.className && typeof element.className === 'string' ? element.className : '';
        return output;
    }

    function find(text) {
        const needle = String(text).toLowerCase();
        const output = [];
        const seen = new Set();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue?.toLowerCase().includes(needle) && node.parentElement && !seen.has(node.parentElement)) {
                seen.add(node.parentElement);
                output.push(node.parentElement);
            }
        }
        return output;
    }

    function cssVar(name) {
        const normalized = name.startsWith('--') ? name : `--${name}`;
        return getComputedStyle(document.body).getPropertyValue(normalized).trim()
            || getComputedStyle(document.documentElement).getPropertyValue(normalized).trim();
    }

    function rulesFor(element, prop) {
        const hits = [];
        function visit(rules, source) {
            for (const rule of rules) {
                if (typeof CSSMediaRule !== 'undefined' && rule instanceof CSSMediaRule
                    && !matchMedia(rule.conditionText).matches) continue;
                if (typeof CSSSupportsRule !== 'undefined' && rule instanceof CSSSupportsRule
                    && !CSS.supports(rule.conditionText)) continue;
                if (rule.cssRules) visit(rule.cssRules, source);
                if (!rule.selectorText || !rule.style) continue;
                const value = rule.style.getPropertyValue(prop);
                if (!value) continue;

                const parts = [];
                let buffer = '';
                let depth = 0;
                for (const character of rule.selectorText) {
                    if (character === '(' || character === '[') depth++;
                    else if (character === ')' || character === ']') depth--;
                    if (character === ',' && depth === 0) {
                        parts.push(buffer);
                        buffer = '';
                    } else {
                        buffer += character;
                    }
                }
                if (buffer) parts.push(buffer);
                const matched = parts.map((selector) => selector.trim()).filter((selector) => {
                    try {
                        return element.matches(selector);
                    } catch {
                        return false;
                    }
                });
                if (matched.length) {
                    hits.push({
                        selector: matched.join(', '),
                        value: value.trim(),
                        important: rule.style.getPropertyPriority(prop) === 'important',
                        source,
                    });
                }
            }
        }

        for (const sheet of document.styleSheets) {
            let rules;
            try {
                rules = sheet.cssRules;
            } catch {
                continue;
            }
            if (rules) visit(rules, sheet.href || `#${sheet.ownerNode?.id || 'inline-style'}`);
        }
        return hits;
    }

    function trace(selector, prop = 'background-color') {
        const startElement = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!startElement) return null;
        const chain = [];
        const seen = new Set();
        let cursor = { element: startElement, prop, walkAncestors: false };

        while (cursor) {
            const key = `${cursor.element === document.body ? 'body' : `${cursor.element.tagName}:${cursor.element.className}`}|${cursor.prop}`;
            if (seen.has(key)) break;
            seen.add(key);

            let found = null;
            if (cursor.walkAncestors) {
                let ancestor = cursor.element;
                while (ancestor) {
                    const hits = rulesFor(ancestor, cursor.prop);
                    if (hits.length) {
                        found = { element: ancestor, ...hits[hits.length - 1] };
                        break;
                    }
                    ancestor = ancestor.parentElement;
                }
            } else {
                const hits = rulesFor(cursor.element, cursor.prop);
                if (hits.length) found = { element: cursor.element, ...hits[hits.length - 1] };
            }

            if (!found) {
                chain.push({ from: '(unresolved)', prop: cursor.prop });
                break;
            }

            const from = found.element === document.body ? 'body'
                : found.element === document.documentElement ? ':root'
                    : found.selector;
            const entry = {
                from,
                prop: cursor.prop,
                raw: found.value,
                important: found.important,
                source: found.source,
            };
            const resolved = getComputedStyle(found.element).getPropertyValue(cursor.prop).trim();
            if (resolved && resolved !== found.value) entry.resolved = resolved;
            chain.push(entry);

            const match = found.value.match(/var\(\s*(--[\w-]+)/);
            if (!match) break;
            cursor = { element: startElement, prop: match[1], walkAncestors: true };
        }
        return chain;
    }

    async function reload() {
        if (inFlight) await inFlight;
        const currentVersion = await fetchVersion();
        const length = await apply();
        lastVersion = currentVersion;
        return length;
    }

    function describe(element) {
        if (element === document.body) return 'body';
        if (element === document.documentElement) return ':root';
        const classes = typeof element.className === 'string' ? element.className.trim().split(/\s+/).filter(Boolean) : [];
        return element.tagName.toLowerCase() + classes.map((name) => `.${name}`).join('');
    }

    function elementsFor(selector, limit = 5) {
        return typeof selector === 'string' ? [...document.querySelectorAll(selector)].slice(0, limit) : [selector];
    }

    function snapshot(element, props) {
        const styles = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        const output = { rect: [box.left, box.top, box.width, box.height].map(Math.round).join(' ') };
        for (const prop of props) output[prop] = styles.getPropertyValue(prop).trim();
        return output;
    }

    // Computed styles and box of the first few matches with the theme on vs. off; only differences are returned.
    // Transitions are frozen while measuring so the unthemed values are final, not mid-transition.
    function compare(selector, props = COMPUTED_PROPS) {
        const style = document.getElementById(STYLE_ID);
        if (!style) throw new Error('theme is not injected');
        const freeze = document.createElement('style');
        freeze.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
        document.head.appendChild(freeze);
        try {
            return elementsFor(selector).map((element) => {
                const themed = snapshot(element, props);
                style.disabled = true;
                const unthemed = snapshot(element, props);
                style.disabled = false;
                const diff = {};
                for (const key of Object.keys(themed)) {
                    if (themed[key] !== unthemed[key]) diff[key] = { themed: themed[key], unthemed: unthemed[key] };
                }
                return { element: describe(element), diff };
            });
        } finally {
            style.disabled = false;
            freeze.remove();
        }
    }

    // Rules from Discord's own stylesheets (not the theme) that set `prop` on the first match: what Discord intends.
    function discordRules(selector, prop) {
        const element = elementsFor(selector, 1)[0];
        if (!element) return null;
        return rulesFor(element, prop).filter((hit) => hit.source !== `#${STYLE_ID}`);
    }

    // colors.css maps Discord variables that haven't been found in the UI yet to loud named colors.
    // Any visible element painted with one is using a variable that now needs a real mapping.
    const PLACEHOLDER_COLORS = {
        'rgb(0, 255, 0)': 'lime',
        'rgb(255, 0, 255)': 'magenta',
        'rgb(255, 255, 0)': 'yellow',
        'rgb(0, 0, 255)': 'blue',
        'rgb(255, 0, 0)': 'red',
    };
    // paint properties and when they actually show (borders, outlines and decorations default to currentColor)
    const PAINT_PROPS = {
        'color': () => true,
        'background-color': () => true,
        'background-image': () => true,
        'box-shadow': () => true,
        'fill': () => true,
        'stroke': (styles) => styles.strokeWidth !== '0px',
        'border-top-color': (styles) => styles.borderTopWidth !== '0px' && styles.borderTopStyle !== 'none',
        'border-right-color': (styles) => styles.borderRightWidth !== '0px' && styles.borderRightStyle !== 'none',
        'border-bottom-color': (styles) => styles.borderBottomWidth !== '0px' && styles.borderBottomStyle !== 'none',
        'border-left-color': (styles) => styles.borderLeftWidth !== '0px' && styles.borderLeftStyle !== 'none',
        'outline-color': (styles) => styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px',
        'text-decoration-color': (styles) => styles.textDecorationLine !== 'none',
    };

    function placeholders(limit = 50) {
        const hits = [];
        for (const element of document.querySelectorAll('body *')) {
            const box = element.getBoundingClientRect();
            if (!box.width || !box.height) continue;
            for (const pseudo of [null, '::before', '::after']) {
                const styles = getComputedStyle(element, pseudo);
                if (pseudo && styles.content === 'none') continue;
                const found = {};
                for (const [prop, visible] of Object.entries(PAINT_PROPS)) {
                    const value = styles.getPropertyValue(prop);
                    const color = Object.keys(PLACEHOLDER_COLORS).find((rgb) => value.includes(rgb));
                    if (color && visible(styles)) (found[PLACEHOLDER_COLORS[color]] ||= []).push(prop);
                }
                for (const [placeholder, props] of Object.entries(found)) {
                    hits.push({ element: describe(element) + (pseudo || ''), placeholder, props });
                }
            }
            if (hits.length >= limit) break;
        }
        return hits.slice(0, limit);
    }

    function status() {
        const style = document.getElementById(STYLE_ID);
        return { mode: EMBEDDED ? 'embedded' : 'server', version: lastVersion, injected: Boolean(style), length: style?.textContent.length ?? 0 };
    }

    const ready = reload().then((length) => {
        start();
        console.log(`[${DISPLAY_NAME}] injected ${length}b${EMBEDDED ? '' : ' — auto-reload on'}. helpers: window.__themeDev`);
        return status();
    });
    ready.catch((error) => console.error(`[${DISPLAY_NAME}] inject failed:`, error));

    window.__themeDev = {
        reload, off, start, stop, status, ready,
        computed, find, cssVar, trace, compare, discordRules, placeholders,
        BASE, DISPLAY_NAME,
    };
})();
