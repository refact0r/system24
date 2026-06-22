const fs = require('fs');
const path = require('path');

const config = require('./theme.config');

const root = path.join(__dirname, '..');
const baseFile = path.join(root, config.baseFile);
const buildFile = path.join(root, config.buildFile);
const srcDir = path.join(root, 'src');

function validateSourceFiles() {
    const discovered = fs.readdirSync(srcDir)
        .filter((file) => file.endsWith('.css'))
        .sort((a, b) => a.localeCompare(b));
    const configured = [...config.sourceFiles].sort((a, b) => a.localeCompare(b));
    if (JSON.stringify(discovered) !== JSON.stringify(configured)) {
        throw new Error(
            `CSS source list mismatch.\nConfigured: ${configured.join(', ')}\nDiscovered: ${discovered.join(', ')}`,
        );
    }
}

function buildSource() {
    validateSourceFiles();
    const combined = config.sourceFiles
        .map((file) => `/* ${file} */\n${fs.readFileSync(path.join(srcDir, file), 'utf8')}\n`)
        .join('');
    fs.mkdirSync(path.dirname(buildFile), { recursive: true });
    fs.writeFileSync(buildFile, combined);
    return combined;
}

function buildCombinedTheme() {
    const compiled = buildSource();
    const base = fs.readFileSync(baseFile, 'utf8');
    const matches = base.split(config.buildImport).length - 1;
    if (matches !== 1) {
        throw new Error(`Expected exactly one build import in ${baseFile}; found ${matches}`);
    }
    return base.replace(config.buildImport, compiled);
}

if (require.main === module) {
    const compiled = buildSource();
    console.log(`Built ${path.relative(root, buildFile)} (${compiled.length} bytes)`);
}

module.exports = { baseFile, buildCombinedTheme, buildFile, buildSource, config, root, srcDir };
