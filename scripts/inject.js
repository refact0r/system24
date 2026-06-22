/* Generic Discord theme browser loader. Runtime values are injected by serve.js. */

window.__themeDev?.off?.();

(() => {
    const runtime = __THEME_DEV_RUNTIME__;
    const BASE = runtime.base;
    const DISPLAY_NAME = runtime.displayName;
    const STYLE_ID = 'theme-dev-injected';
    const POLL_MS = 800;

    async function checkedFetch(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
        return response;
    }

    async function fetchCSS() {
        return (await checkedFetch(`${BASE}/theme.css?t=${Date.now()}`)).text();
    }

    async function fetchVersion() {
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
        const props = [
            'color', 'background-color', 'background-image', 'opacity',
            'border', 'border-color', 'border-radius', 'box-shadow',
            'padding', 'margin', 'width', 'height', 'display', 'position',
            'font-family', 'font-size', 'font-weight', 'line-height',
            'transition', 'transform', 'filter', 'backdrop-filter', 'z-index',
        ];
        const output = {};
        for (const prop of props) output[prop] = styles.getPropertyValue(prop).trim();
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

    window.__themeDev = { reload, off, start, stop, computed, find, cssVar, trace, BASE, DISPLAY_NAME };

    reload().then((length) => {
        start();
        console.log(`[${DISPLAY_NAME}] injected ${length}b — auto-reload on. helpers: window.__themeDev`);
    }).catch((error) => console.error(`[${DISPLAY_NAME}] inject failed:`, error));
})();
