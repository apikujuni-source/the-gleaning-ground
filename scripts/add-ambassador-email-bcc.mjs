import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
const bccRecipients = 'apikujuni@gmail.com,ojoshuaoladipupo@gmail.com';

let html = await readFile(indexPath, 'utf8');

const original = "          window.location.href = value;";
const replacement = [
  "          const bccRecipients = '" + bccRecipients + "';",
  "          const target = /[?&]bcc=/i.test(value)",
  "            ? value",
  "            : value + (value.includes('?') ? '&' : '?') + 'bcc=' + encodeURIComponent(bccRecipients);",
  "          window.location.href = target;"
].join('\n');

const matches = html.split(original).length - 1;
if (matches !== 1) {
  throw new Error(`Expected exactly one ambassador approval email navigation target, found ${matches}.`);
}

html = html.replace(original, replacement);

if (!html.includes("bccRecipients = '" + bccRecipients + "'")) {
  throw new Error('Ambassador approval email BCC recipients were not installed.');
}

await writeFile(indexPath, html, 'utf8');
console.log('Added ambassador approval email BCC recipients without changing the existing mailto workflow.');
