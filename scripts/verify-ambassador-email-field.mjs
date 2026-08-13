import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('_site/divine-blueprint-site/ambassadors/index.html');
if (!fs.existsSync(file)) throw new Error(`Missing Ambassador page: ${file}`);
const html = fs.readFileSync(file, 'utf8');
const form = html.match(/<form\b[^>]*name=["']divine-blueprint-ambassador-application["'][^>]*>[\s\S]*?<\/form>/i)?.[0] || '';
if (!form) throw new Error('Ambassador application form not found.');
const emailInputs = form.match(/<input\b[^>]*name=["']email["'][^>]*>/gi) || [];
if (emailInputs.length !== 1) throw new Error(`Expected exactly one email field, found ${emailInputs.length}.`);
if (!/type=["']email["']/i.test(emailInputs[0]) || !/required/i.test(emailInputs[0])) throw new Error('Ambassador email field must be type=email and required.');
if (!/Email address \(required\)/i.test(form)) throw new Error('Required email label copy is missing.');
if (!/This is how we will contact selected ambassadors\./i.test(form)) throw new Error('Ambassador email contact note is missing.');
if (/<div class=["']form-row["']>\s*<label>Full name[\s\S]*?<label>Email address/i.test(form)) throw new Error('Email field is still paired side-by-side with Full name.');
console.log('Ambassador email field verified: one required, full-width, clearly labeled email input.');
