// ==UserScript==
// @name         Discord theme dev loader
// @namespace    https://github.com/refact0r
// @version      1.0.0
// @description  Auto-injects the theme served by a local `npm run serve` process.
// @match        https://discord.com/*
// @match        https://canary.discord.com/*
// @match        https://ptb.discord.com/*
// @run-at       document-end
// @grant        none
// @connect      127.0.0.1
// ==/UserScript==

(async () => {
    const base = 'http://127.0.0.1:8765';
    try {
        const code = await (await fetch(`${base}/inject.js`)).text();
        (0, eval)(code);
    } catch (error) {
        console.warn('[theme-dev] server not reachable at', base, '— run `npm run serve` in the repo');
    }
})();
