const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const srcDir = path.join(__dirname, '..', 'src');
const baseFile = path.join(__dirname, '..', 'system24.theme.css');
const outputFile = process.env.DEV_OUTPUT_PATH;
const pathToIgnore = 'https://refact0r.github.io/system24/';

if (!outputFile) {
	console.error('DEV_OUTPUT_PATH is not set in .env file');
	process.exit(1);
}

async function replaceImports(content) {
	const importRegex = /@import url\('([^']+)'\);/g;
	let match;
	while ((match = importRegex.exec(content)) !== null) {
		const importUrl = match[1];
		const filePath = importUrl.replace(pathToIgnore, '');
		const localFilePath = path.join(__dirname, '..', filePath);
		if (fs.existsSync(localFilePath)) {
			const importedContent = fs.readFileSync(localFilePath, 'utf8');
			content = content.replace(match[0], importedContent);
		} else {
			console.error(`File not found: ${localFilePath}`);
		}
	}
	return content;
}

async function combineCSS() {
	let combinedCSS = fs.readFileSync(baseFile, 'utf8');
	combinedCSS = await replaceImports(combinedCSS);
	fs.writeFileSync(outputFile, combinedCSS);
	console.log('Updated development CSS file.');
}

combineCSS();

chokidar.watch(srcDir).on('change', (event, path) => {
	console.log('Changes detected. Rebuilding...');
	combineCSS();
});
