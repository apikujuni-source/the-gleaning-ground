import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('_site/divine-blueprint-site/ambassadors/index.html');
if (!fs.existsSync(file)) throw new Error(`Missing Ambassador page: ${file}`);
let html = fs.readFileSync(file, 'utf8');
html = html.replace('Email address <span>(required)</span>', 'Email address (required)');
fs.writeFileSync(file, html);
console.log('Ambassador email label finalized.');
