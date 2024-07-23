const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const srcDir = path.join(__dirname, '..', 'src');
const outputFile = process.env.DEV_OUTPUT_PATH;

if (!outputFile) {
	console.error('DEV_OUTPUT_PATH is not set in .env file');
	process.exit(1);
}

function combineCSS() {
	let combinedCSS = '';
	fs.readdirSync(srcDir).forEach((file) => {
		if (path.extname(file) === '.css') {
			const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
			combinedCSS += content + '\n';
		}
	});
	// Write the combined CSS to the output file
	fs.writeFileSync(outputFile, combinedCSS);
	console.log('Updated development CSS file.');
}

// Initial build
combineCSS();

// Watch for changes
chokidar.watch(srcDir).on('change', (event, path) => {
	console.log('Changes detected. Rebuilding...');
	combineCSS();
});
