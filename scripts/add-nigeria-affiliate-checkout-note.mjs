import { readFile, writeFile } from 'node:fs/promises';

const pagePath = '_site/divine-blueprint-site/nigeria-order/index.html';
let html = await readFile(pagePath, 'utf8');

const marker = 'data-affiliate-code-note="true"';
if (!html.includes(marker)) {
  const payButtonPattern = /(<a\b[^>]*class=["'][^"']*order-submit[^"']*["'][^>]*id=["']stripe-pay-button["'][^>]*>)/i;
  if (!payButtonPattern.test(html)) {
    throw new Error('Nigeria Stripe checkout button was not found for affiliate-code note.');
  }

  const note = `<p class="order-help" data-affiliate-code-note="true"><strong>Buying through an Ambassador?</strong> Enter the <strong>Affiliate / Ambassador Code</strong> they gave you during secure Stripe checkout. The code is optional and does not change your price.</p>`;
  html = html.replace(payButtonPattern, `${note}\n$1`);
}

await writeFile(pagePath, html, 'utf8');
console.log('Added Nigeria affiliate / ambassador code checkout guidance.');
