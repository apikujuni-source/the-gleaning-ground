import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = "_site/divine-blueprint-site";
const pagePaths = [
  join(root, "companion.html"),
  join(root, "companion", "index.html")
];
const stylesPath = join(root, "assets", "styles.css");
const coverUrl = "/assets/divine-blueprint-cover.webp?v=20260723-flat-original";
const coverAlt = "The Divine Blueprint: The Making, Maturing, and Manifestation of God's Sons, by Ayo-Paul Ikujuni";

const originalHero = `<section class="section companion-original-section" aria-labelledby="companion-original-title">
  <div class="container companion-original-grid">
    <div class="companion-original-copy">
      <h1 id="companion-original-title">More Than a<br>Journal</h1>
      <p class="lead">The Companion helps readers move from reading to encounter, application, and transformation.</p>
      <ul class="list-check companion-original-list">
        <li>Chapter objectives</li>
        <li>Scripture immersion</li>
        <li>Personal inventories</li>
        <li>Guided prayers</li>
        <li>Weekly obedience challenges</li>
        <li>Spiritual checkpoints</li>
        <li>Blueprint milestones</li>
      </ul>
      <a class="btn btn-primary" href="#download-editions">Get the Companion</a>
    </div>
    <figure class="companion-flat-book" aria-label="The Divine Blueprint book cover">
      <img class="companion-flat-book-image" src="${coverUrl}" alt="${coverAlt}" width="1024" height="1536" loading="eager" decoding="async">
    </figure>
  </div>
</section>`;

function replaceHero(html) {
  const patterns = [
    /<section\b[^>]*class=(['"])[^'"]*\bpage-hero\b[^'"]*\bcompanion-download-hero\b[^'"]*\1[^>]*>[\s\S]*?<\/section>/i,
    /<section\b[^>]*class=(['"])[^'"]*\bcompanion-original-section\b[^'"]*\1[^>]*>[\s\S]*?<\/section>/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(html)) return html.replace(pattern, originalHero);
  }

  throw new Error("Could not find the Companion hero section to restore.");
}

function removeCoverRuntimeScripts(html) {
  return html
    .replace(/\s*<script\b[^>]*src=(['"])[^'"]*(?:canonical-book-cover|divine-blueprint-cover-final)[^'"]*\1[^>]*><\/script>/gi, "")
    .replace(/\s*<script\b[^>]*src=(['"])[^'"]*companion-cover-display[^'"]*\1[^>]*><\/script>/gi, "");
}

function removeOtherBookCoverFigures(html) {
  const heroEnd = html.indexOf("</section>", html.indexOf("companion-original-section"));
  if (heroEnd < 0) return html;
  const before = html.slice(0, heroEnd + 10);
  let after = html.slice(heroEnd + 10);
  after = after.replace(/<figure\b[^>]*class=(['"])[^'"]*(?:divine-blueprint-full-cover|companion-flat-book)[^'"]*\1[^>]*>[\s\S]*?<\/figure>/gi, "");
  return before + after;
}

for (const pagePath of pagePaths) {
  let html = await readFile(pagePath, "utf8");
  html = replaceHero(html);
  html = removeCoverRuntimeScripts(html);
  html = removeOtherBookCoverFigures(html);
  await writeFile(pagePath, html, "utf8");
}

const marker = "/* RESTORED original Companion page with one flat cover */";
const css = `

${marker}
body.companion-page .companion-original-section,
.companion-original-section{
  background:#fbfaf6;
  padding:clamp(72px,8vw,118px) 0;
  overflow:visible;
}
.companion-original-grid{
  display:grid;
  grid-template-columns:minmax(0,.82fr) minmax(300px,1.18fr);
  gap:clamp(48px,7vw,100px);
  align-items:center;
}
.companion-original-copy h1{
  margin:0 0 1.35rem;
  color:#0b2b4d;
  font-family:Georgia,serif;
  font-size:clamp(3.5rem,6.1vw,5.7rem);
  line-height:.92;
  letter-spacing:-.035em;
}
.companion-original-copy .lead{
  max-width:620px;
  margin:0 0 1.8rem;
  color:#152b43;
  font-size:1.1rem;
  line-height:1.65;
}
.companion-original-list{
  margin:0 0 2rem;
  padding:0;
  list-style:none;
}
.companion-original-list li{
  margin:.85rem 0;
  color:#152b43;
  font-size:1.05rem;
}
.companion-flat-book{
  display:flex;
  align-items:center;
  justify-content:center;
  width:100%;
  margin:0;
  padding:0;
  overflow:visible;
  background:transparent;
  border:0;
}
.companion-flat-book-image{
  display:block;
  width:min(390px,100%);
  max-width:100%;
  height:auto;
  max-height:none;
  aspect-ratio:2/3;
  object-fit:contain;
  object-position:center;
  margin:0 auto;
  padding:0;
  border:0;
  border-radius:1px;
  transform:none;
  clip:auto;
  clip-path:none;
  filter:drop-shadow(16px 22px 24px rgba(7,27,49,.18));
}
@media(max-width:860px){
  .companion-original-grid{grid-template-columns:1fr;text-align:left}
  .companion-flat-book{justify-content:flex-start}
  .companion-flat-book-image{width:min(340px,88vw);margin:0}
}
@media(max-width:560px){
  .companion-original-section{padding:58px 0}
  .companion-original-copy h1{font-size:clamp(3rem,16vw,4.25rem)}
  .companion-flat-book{justify-content:center}
  .companion-flat-book-image{margin:0 auto}
}
`;

let styles = await readFile(stylesPath, "utf8");
if (styles.includes(marker)) {
  styles = styles.slice(0, styles.indexOf(marker)).replace(/\s+$/, "") + css;
} else {
  styles += css;
}
await writeFile(stylesPath, styles, "utf8");

for (const pagePath of pagePaths) {
  const html = await readFile(pagePath, "utf8");
  const coverCount = (html.match(/class="companion-flat-book-image"/g) || []).length;
  if (coverCount !== 1) throw new Error(`${pagePath} contains ${coverCount} flat cover images; expected exactly one.`);
  if (/class=(['"])[^'"]*(?:companion-cover-visual|divine-blueprint-full-cover|journal-visual)[^'"]*\1/i.test(html)) {
    throw new Error(`${pagePath} still contains a legacy or duplicate cover visual.`);
  }
}

console.log("Restored the original Companion page design with exactly one flat book-cover image.");
