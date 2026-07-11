const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'data', 'timeline.json');
const destinationDirectory = path.join(__dirname, '..', 'www', 'data');
const jsonDestination = path.join(destinationDirectory, 'timeline.json');
const scriptDestination = path.join(destinationDirectory, 'timeline-data.js');

fs.mkdirSync(destinationDirectory, { recursive: true });
const data = fs.readFileSync(source, 'utf8');
fs.writeFileSync(jsonDestination, data);
fs.writeFileSync(scriptDestination, `window.TIMELINE_DATA = ${data.trim()};\n`);

console.log(`Built ${path.relative(process.cwd(), jsonDestination)} and ${path.relative(process.cwd(), scriptDestination)}`);
