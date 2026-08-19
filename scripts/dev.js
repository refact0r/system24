const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const { baseFile, buildCombinedTheme, root, srcDir } = require('./build');

require('dotenv').config({ path: path.join(root, '.env') });

const outputPaths = (process.env.DEV_OUTPUT_PATH || '')
    .split(',')
    .map((outputPath) => outputPath.trim())
    .filter(Boolean);

if (outputPaths.length === 0) {
    console.error('DEV_OUTPUT_PATH is not set in .env file');
    process.exit(1);
}

function processFiles() {
    try {
        const theme = buildCombinedTheme();
        for (const outputPath of outputPaths) {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, theme);
            console.log(`Updated ${outputPath}`);
        }
    } catch (error) {
        console.error('Error processing files:', error);
    }
}

processFiles();

const watcher = chokidar.watch([baseFile, `${srcDir}/**/*.css`], { ignoreInitial: true });
watcher
    .on('all', (event, file) => {
        console.log(`${event}: ${path.relative(root, file)}`);
        processFiles();
    })
    .on('error', (error) => console.error(`Watcher error: ${error}`));
