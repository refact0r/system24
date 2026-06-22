/* Browser dev server. See docs/BROWSER_DEV.md. */

const fs = require('fs');
const http = require('http');
const path = require('path');
const chokidar = require('chokidar');

const { baseFile, buildCombinedTheme, config, root, srcDir } = require('./build');

const PORT = Number(process.env.PORT) || 8765;
const HOST = process.env.HOST || '127.0.0.1';
const injectFile = path.join(__dirname, 'inject.js');

let cached = buildCombinedTheme();
let version = 1;

function rebuild(reason) {
    try {
        cached = buildCombinedTheme();
        version += 1;
        console.log(`[${new Date().toLocaleTimeString()}] rebuilt (${cached.length} bytes) — ${reason}`);
    } catch (error) {
        console.error('build failed:', error.message);
    }
}

function send(request, response, status, contentType, body) {
    response.statusCode = status;
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', contentType);
    response.setHeader('Content-Length', Buffer.byteLength(body));
    response.end(request.method === 'HEAD' ? undefined : body);
}

const server = http.createServer((request, response) => {
    if (request.method === 'OPTIONS') {
        response.statusCode = 204;
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        response.end();
        return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        send(request, response, 405, 'text/plain; charset=utf-8', 'Method not allowed\n');
        return;
    }

    const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
    if (pathname === '/version') {
        send(request, response, 200, 'application/json; charset=utf-8', JSON.stringify({ version }));
        return;
    }
    if (pathname === '/inject.js') {
        const runtime = {
            base: `http://${request.headers.host || `${HOST}:${PORT}`}`,
            displayName: config.displayName,
        };
        const loader = fs.readFileSync(injectFile, 'utf8')
            .replace('__THEME_DEV_RUNTIME__', JSON.stringify(runtime));
        send(request, response, 200, 'application/javascript; charset=utf-8', loader);
        return;
    }
    if (pathname === '/theme.css') {
        send(request, response, 200, 'text/css; charset=utf-8', cached);
        return;
    }
    send(request, response, 404, 'text/plain; charset=utf-8', 'Not found\n');
});

server.listen(PORT, HOST, () => {
    console.log(`${config.displayName} dev server @ http://${HOST}:${PORT}`);
    console.log('  CSS:    /theme.css');
    console.log('  loader: /inject.js  (eval in Discord DevTools to install)');
    console.log(`one-liner: fetch('http://${HOST}:${PORT}/inject.js').then(r=>r.text()).then(eval)`);
});

const watcher = chokidar.watch([baseFile, `${srcDir}/**/*.css`], { ignoreInitial: true });
watcher
    .on('all', (event, file) => rebuild(`${event} ${path.relative(root, file)}`))
    .on('error', (error) => console.error(`Watcher error: ${error}`));
