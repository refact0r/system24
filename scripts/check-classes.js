/* Flags Discord classes in src/*.css that no longer exist in the current Discord client.
 *
 *   npm run check-classes                 # check against the default class list (cached for 6h)
 *   npm run check-classes -- --refresh    # re-download the class list
 *   npm run check-classes -- --json       # machine-readable output
 *   npm run check-classes -- --source <url-or-path>
 *
 * Accepts the itmesarah/DiscordClasses format ({ module: { key: "class" } }) or
 * sadan's dump format ({ module: { class_names: [{ value }] } }). Exits 1 when dead classes are found. */

const fs = require('fs');
const path = require('path');

const { config, root, srcDir } = require('./build');

const DEFAULT_SOURCE = 'https://raw.githubusercontent.com/itmesarah/DiscordClasses/main/discordclasses.json';
const CACHE_FILE = path.join(root, '.theme-dev', 'classes.json');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
// Discord's hashed class names: readable name, underscore(s), 5-6 hex chars. e.g. listItem__650eb, grabber_ec237e.
const CLASS_PATTERN = /\.(-?[A-Za-z_][\w-]*?_[0-9a-f]{5,6})(?![\w-])/g;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

async function loadSource() {
    const source = option('--source') || DEFAULT_SOURCE;
    if (!/^https?:/.test(source)) return JSON.parse(fs.readFileSync(source, 'utf8'));

    const cached = fs.existsSync(CACHE_FILE) && JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (cached && cached.source === source && Date.now() - cached.fetchedAt < CACHE_TTL_MS && !flag('--refresh')) {
        return cached.data;
    }
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${source}`);
    const data = await response.json();
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ source, fetchedAt: Date.now(), data }));
    return data;
}

function classesFrom(data) {
    const classes = new Set();
    for (const module of Object.values(data)) {
        const values = Array.isArray(module?.class_names)
            ? module.class_names.map((entry) => entry.value)
            : Object.values(module).filter((value) => typeof value === 'string');
        // composed values look like "button_abc123 base_def456"; every token is a real class
        for (const value of values) for (const name of value.split(' ')) if (name) classes.add(name);
    }
    return classes;
}

const readableName = (name) => name.replace(/_+[0-9a-f]{5,6}$/, '');

function usedClasses() {
    const used = [];
    for (const file of config.sourceFiles) {
        const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
        // blank out comments but keep newlines so line numbers stay right
        const stripped = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
        const lines = text.split('\n');
        stripped.split('\n').forEach((line, index) => {
            for (const match of line.matchAll(CLASS_PATTERN)) {
                used.push({ name: match[1], file: `src/${file}`, line: index + 1, text: lines[index].trim() });
            }
        });
    }
    return used;
}

async function main() {
    const live = classesFrom(await loadSource());
    const byName = new Map();
    for (const name of live) {
        const key = readableName(name);
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key).push(name);
    }

    const used = usedClasses();
    const dead = used.filter((use) => !live.has(use.name));
    const deadNames = [...new Set(dead.map((use) => use.name))];
    const report = deadNames.map((name) => ({
        name,
        uses: dead.filter((use) => use.name === name).map(({ file, line, text }) => ({ file, line, text })),
        sameName: byName.get(readableName(name)) || [],
    }));

    if (flag('--json')) {
        console.log(JSON.stringify({ checked: new Set(used.map((use) => use.name)).size, dead: report }, null, 2));
    } else {
        console.log(`${new Set(used.map((use) => use.name)).size} Discord classes checked, ${report.length} not found in the current client.`);
        for (const entry of report) {
            const count = entry.sameName.length;
            const hint = count === 0 ? 'no current class with this name'
                : count <= 3 ? `current classes with this name: ${entry.sameName.join(', ')}`
                    : `${count} current classes with this name (ambiguous)`;
            console.log(`\n${entry.name} — ${hint}`);
            for (const use of entry.uses) console.log(`  ${use.file}:${use.line}  ${use.text}`);
        }
    }
    process.exitCode = report.length ? 1 : 0;
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 2;
});
