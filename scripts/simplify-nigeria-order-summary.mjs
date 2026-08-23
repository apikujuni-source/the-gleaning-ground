import { readFile, writeFile } from 'node:fs/promises';

const pagePath = '_site/divine-blueprint-site/nigeria-order/index.html';
let html = await readFile(pagePath, 'utf8');

const bookSummaryPattern = /<div class="order-book">\s*<img([^>]+)>\s*<div><span class="order-eyebrow">Paperback<\/span><h2>The Divine Blueprint<\/h2><p>by Ayo-Paul Ikujuni<\/p><\/div>\s*<\/div>/i;

if (!bookSummaryPattern.test(html)) {
  throw new Error('Nigeria order book summary block was not found.');
}

html = html.replace(
  bookSummaryPattern,
  '<div class="order-book" data-order-cover-only="true" style="display:flex;justify-content:center"><img$1></div>'
);

await writeFile(pagePath, html, 'utf8');
console.log('Simplified Nigeria order summary to cover-only presentation.');
