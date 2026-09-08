import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
const ccEmail = 'apikujuni@gmail.com';

let html = await readFile(indexPath, 'utf8');

const oldReturn = "return 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);";
const newReturn = "return 'mailto:' + encodeURIComponent(email) + '?cc=' + encodeURIComponent('" + ccEmail + "') + '&subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);";

if (!html.includes(newReturn)) {
  if (!html.includes(oldReturn)) throw new Error('Could not locate ambassador approval email mailto builder.');
  html = html.replace(oldReturn, newReturn);
}

const oldReadyNote = 'Opens a pre-addressed approval email with the personal referral link included. Review it before sending.';
const newReadyNote = 'Opens a pre-addressed approval email with the personal referral link included and ' + ccEmail + ' copied automatically. Review it before sending.';
if (html.includes(oldReadyNote)) html = html.replace(oldReadyNote, newReadyNote);

if (!html.includes("'?cc=' + encodeURIComponent('" + ccEmail + "')")) {
  throw new Error('Ambassador approval email CC was not installed.');
}

await writeFile(indexPath, html, 'utf8');
console.log('Ambassador approval emails now CC ' + ccEmail + ' automatically.');
