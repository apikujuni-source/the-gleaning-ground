import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const pagePath = join('_site', 'divine-blueprint-site', 'nigeria-order', 'index.html');
let html = await readFile(pagePath, 'utf8');

const marker = '/* Nigeria order title readability fix */';
if (!html.includes(marker)) {
  const styles = `<style>
${marker}
.order-hero{
  position:relative!important;
  isolation:isolate!important;
  background:#102f5e!important;
  background-image:none!important;
  padding-top:clamp(48px,7vw,82px)!important;
  padding-bottom:clamp(36px,5vw,54px)!important;
  overflow:visible!important;
}
.order-hero::before,.order-hero::after{
  content:none!important;
  display:none!important;
  background:none!important;
}
.order-hero h1,.order-hero h1 *{
  display:block!important;
  max-width:960px!important;
  margin:0 auto 20px!important;
  color:#ffffff!important;
  -webkit-text-fill-color:#ffffff!important;
  background:transparent!important;
  background-image:none!important;
  background-clip:border-box!important;
  -webkit-background-clip:border-box!important;
  opacity:1!important;
  visibility:visible!important;
  filter:none!important;
  mix-blend-mode:normal!important;
  text-shadow:none!important;
  font-weight:700!important;
  line-height:1.14!important;
  letter-spacing:-.012em!important;
  overflow:visible!important;
  clip:auto!important;
  clip-path:none!important;
  -webkit-clip-path:none!important;
  text-wrap:balance;
  overflow-wrap:normal!important;
  word-break:normal!important;
}
.order-hero .order-eyebrow,.order-hero .order-eyebrow *{
  color:#ffe6a6!important;
  -webkit-text-fill-color:#ffe6a6!important;
  background:none!important;
  opacity:1!important;
  text-shadow:none!important;
}
.order-hero p,.order-hero p *{
  color:#fff7e8!important;
  -webkit-text-fill-color:#fff7e8!important;
  background:none!important;
  opacity:1!important;
  font-weight:500!important;
  text-shadow:none!important;
}
.order-nav{
  background:#0a2348!important;
  background-image:none!important;
}
.order-nav .order-brand,.order-nav .order-brand *,.order-nav .nav-links a,.order-nav .nav-links a *{
  color:#ffffff!important;
  -webkit-text-fill-color:#ffffff!important;
  background:none!important;
  opacity:1!important;
  visibility:visible!important;
  text-shadow:none!important;
}
@media(max-width:560px){
  .order-hero{
    padding:40px 18px 34px!important;
  }
  .order-hero h1,.order-hero h1 *{
    font-size:clamp(2rem,10.5vw,3rem)!important;
    line-height:1.16!important;
    letter-spacing:-.006em!important;
    max-width:100%!important;
  }
  .order-hero p,.order-hero p *{
    font-size:1rem!important;
    line-height:1.65!important;
  }
}
</style>`;
  html = html.replace('</head>', `${styles}\n</head>`);
}

for (const required of [
  marker,
  'background:#102f5e!important',
  '-webkit-text-fill-color:#ffffff!important',
  'line-height:1.14!important'
]) {
  if (!html.includes(required)) throw new Error(`Nigeria title readability fix missing: ${required}`);
}

await writeFile(pagePath, html, 'utf8');
console.log('Applied fail-safe high-contrast Nigeria order title/header treatment.');
