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

const pricePattern = /<div class="order-price-main"><strong>([^<]+)<\/strong><del>([^<]+)<\/del><\/div>/i;
if (!pricePattern.test(html)) {
  throw new Error('Nigeria preorder current/regular price block was not found.');
}

html = html.replace(
  pricePattern,
  `<div class="order-price-main" data-preorder-price-display="true">
    <div class="order-price-current">
      <span class="order-price-label">Preorder price</span>
      <strong>$1</strong>
    </div>
    <div class="order-price-regular">
      <span class="order-price-label">Regular price</span>
      <del>$2</del>
    </div>
  </div>`
);

const regionNotice = `<div class="order-region-notice" data-nigeria-only-notice="true">
  <strong>Nigeria orders only.</strong>
  This checkout is for paperback orders delivered within Nigeria. If you are ordering from outside Nigeria, please use the U.S. / International Amazon checkout on the main book page.
  <a href="/">Go to the main book page →</a>
</div>`;

if (!html.includes('data-nigeria-only-notice="true"')) {
  const heroPattern = /(<section class="order-hero">[\s\S]*?<p>[\s\S]*?<\/p>)(\s*<\/section>)/i;
  if (!heroPattern.test(html)) {
    throw new Error('Nigeria order hero was not found for the region notice.');
  }
  html = html.replace(heroPattern, `$1\n${regionNotice}$2`);
}

const styleMarker = '/* Nigeria order clarity */';
if (!html.includes(styleMarker)) {
  const extraStyles = `
${styleMarker}
.order-region-notice{max-width:760px;margin:22px auto 0;padding:14px 16px;border:1px solid rgba(184,135,39,.36);border-radius:12px;background:rgba(255,250,240,.92);color:#4f463e;font-size:.92rem;line-height:1.55;text-align:left}
.order-region-notice strong{color:#102f5e}
.order-region-notice a{display:inline-block;margin-left:.25rem;color:#173f6b!important;font-weight:800;text-decoration:underline!important;text-underline-offset:2px}
.order-price-current,.order-price-regular{display:grid;gap:3px}
.order-price-label{color:#71675e;font-size:.72rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.order-price-current strong{display:block}
.order-price-regular{text-align:right}
.order-price-regular del{display:block;color:#8d4b43;font-size:1.08rem;font-weight:700;text-decoration-thickness:2px}
@media(max-width:480px){.order-price-main{align-items:flex-start;flex-direction:column}.order-price-regular{text-align:left}.order-region-notice a{display:block;margin:.45rem 0 0}}
`;
  html = html.replace('</style>', `${extraStyles}\n</style>`);
}

await writeFile(pagePath, html, 'utf8');
console.log('Simplified Nigeria order summary, clarified Nigeria-only checkout, and emphasized regular/preorder pricing.');
