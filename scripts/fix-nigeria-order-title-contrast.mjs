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
  background:linear-gradient(180deg,#f7efe0 0%,#fffaf1 72%,#fffdf8 100%)!important;
}
.order-hero::before{
  content:"";
  position:absolute;
  inset:0;
  z-index:-1;
  background:radial-gradient(circle at 50% 0%,rgba(184,135,39,.15),transparent 58%);
  pointer-events:none;
}
.order-hero h1{
  display:block!important;
  max-width:940px!important;
  margin:0 auto 18px!important;
  color:#102f5e!important;
  -webkit-text-fill-color:#102f5e!important;
  background:none!important;
  background-image:none!important;
  opacity:1!important;
  visibility:visible!important;
  filter:none!important;
  mix-blend-mode:normal!important;
  text-shadow:0 1px 0 rgba(255,255,255,.95),0 2px 12px rgba(16,47,94,.08)!important;
  font-weight:700!important;
  line-height:1.08!important;
  letter-spacing:-.018em!important;
  overflow:visible!important;
  text-wrap:balance;
  overflow-wrap:normal;
  word-break:normal;
}
.order-hero .order-eyebrow{
  color:#603817!important;
  -webkit-text-fill-color:#603817!important;
  background:none!important;
  opacity:1!important;
}
.order-hero p{
  color:#443b34!important;
  -webkit-text-fill-color:#443b34!important;
  opacity:1!important;
  font-weight:500!important;
}
.order-nav .order-brand,.order-nav .nav-links a{
  color:#fff7df!important;
  -webkit-text-fill-color:#fff7df!important;
  opacity:1!important;
  text-shadow:0 1px 2px rgba(0,0,0,.22)!important;
}
@media(max-width:560px){
  .order-hero h1{
    font-size:clamp(2.15rem,12vw,3.35rem)!important;
    line-height:1.1!important;
    letter-spacing:-.012em!important;
  }
  .order-hero{padding-left:18px!important;padding-right:18px!important;}
}
</style>`;
  html = html.replace('</head>', `${styles}\n</head>`);
}

for (const required of [marker, '-webkit-text-fill-color:#102f5e!important', 'line-height:1.08!important']) {
  if (!html.includes(required)) throw new Error(`Nigeria title readability fix missing: ${required}`);
}

await writeFile(pagePath, html, 'utf8');
console.log('Improved Nigeria order title/header readability and contrast.');
