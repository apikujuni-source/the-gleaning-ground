import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const cssPath = path.join(siteDir, 'assets', 'styles.css');
const pagePaths = [
  path.join(siteDir, 'give-a-copy', 'index.html'),
  path.join(siteDir, 'give-a-copy.html')
];
const marker = '/* Give a Copy Form Layout */';

for (const pagePath of pagePaths) {
  if (!fs.existsSync(pagePath)) throw new Error(`Give a Copy page not found: ${pagePath}`);
  let html = fs.readFileSync(pagePath, 'utf8');
  if (!/class=["']skip-link["']/i.test(html)) {
    html = html.replace(/<body>/i, '<body>\n<a class="skip-link" href="#main">Skip to content</a>');
  }
  fs.writeFileSync(pagePath, html);
}

if (!fs.existsSync(cssPath)) throw new Error(`Divine Blueprint stylesheet not found: ${cssPath}`);
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes(marker)) {
  css += `\n${marker}\n.partner-form-layout{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(2rem,5vw,5rem);align-items:start}.partner-interest-form{background:#fff;border:1px solid rgba(26,54,78,.14);border-radius:24px;padding:clamp(1.4rem,3vw,2.4rem);box-shadow:0 18px 45px rgba(20,42,60,.09)}.partner-interest-form .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.partner-interest-form label{display:grid;gap:.45rem;font-weight:600}.partner-interest-form input,.partner-interest-form select,.partner-interest-form textarea{width:100%;border:1px solid rgba(26,54,78,.22);border-radius:10px;padding:.8rem;background:#fff;color:inherit;font:inherit}.partner-interest-form textarea{resize:vertical}.partner-interest-form .form-span{grid-column:1/-1}.partner-interest-form .btn{margin-top:1.2rem}.form-hidden{position:absolute!important;left:-9999px!important}@media(max-width:820px){.partner-form-layout,.partner-interest-form .form-grid{grid-template-columns:1fr}.partner-interest-form .form-span{grid-column:auto}}\n`;
  fs.writeFileSync(cssPath, css);
}

console.log('Give a Copy page accessibility and form layout finalized.');
