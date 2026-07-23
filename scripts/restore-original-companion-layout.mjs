import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = "_site/divine-blueprint-site";
const stylesPath = join(root, "assets", "styles.css");
const cleanDirectory = join(root, "companion");
const pagePaths = [join(root, "companion.html"), join(cleanDirectory, "index.html")];
const coverParts = [
  ".source/divine-blueprint/companion-journal-cover/part00",
  ".source/divine-blueprint/companion-journal-cover/part01",
  ".source/divine-blueprint/companion-journal-cover/part02"
];
const coverAssetPath = join(root, "assets", "companion-journal-cover.webp");

const coverUrl = "/assets/companion-journal-cover.webp?v=20260722-journal-cover";
const fillableUrl = "/assets/downloads/The-Divine-Blueprint-Companion-Fillable.pdf";
const printUrl = "/assets/downloads/The-Divine-Blueprint-Companion-Print-Ready.pdf";
const coverAlt = "The Divine Blueprint Companion Journal cover by Ayo-Paul Ikujuni";

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Download The Divine Blueprint Companion as a fillable digital journal or a print-ready personal journal.">
<base href="/">
<link rel="canonical" href="https://divineblueprint.gleaningground.com/companion">
<title>The Companion Journal | The Divine Blueprint</title>
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="companion-page companion-single-cover-page">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="container nav-wrap">
<a class="brand" href="/"><img src="/assets/logo.svg" alt=""><span>The Divine<br>Blueprint</span></a>
<nav class="nav-links" aria-label="Primary"><a href="/">Home</a><a href="/start-here">Start Here</a><a href="/journey">The Journey</a><a href="/bible-studies">Bible Studies</a><a href="/teachings">Teachings</a><a href="/podcast">Podcast</a><a href="/companion" aria-current="page">The Companion</a><a href="/about">About</a></nav>
<div class="nav-actions"><button class="btn btn-primary" type="button" data-modal-open>Get the Book</button><button class="menu-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">☰</button></div>
</div></header>
<main id="main">
<section class="section companion-original-section" aria-labelledby="companion-original-title">
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
    <figure class="companion-flat-book" aria-label="The Divine Blueprint Companion Journal cover">
      <img class="companion-flat-book-image" src="${coverUrl}" alt="${coverAlt}" width="512" height="768" loading="eager" decoding="async">
    </figure>
  </div>
</section>

<section class="section section-light"><div class="container companion-intro-grid"><div><span class="section-kicker">Guided Spiritual Formation</span><h2>Turn Every Chapter Into a Formation Experience</h2><p>The Companion follows all nine chapters of <em>The Divine Blueprint</em> and creates space for Scripture meditation, personal inventory, guided reflection, spiritual practices, prayer, and measurable milestones.</p><ul class="list-check"><li>98 pages in a 7 × 10-inch journal format</li><li>Nine chapter-by-chapter formation modules</li><li>Fillable writing fields and clickable checkboxes</li><li>Personal-print edition with writing lines</li><li>90-day journey plan and chapter completion tracker</li><li>Private by design—your journal entries never return to the website</li></ul></div><div class="companion-facts"><div><strong>98</strong><span>Journal pages</span></div><div><strong>9</strong><span>Formation modules</span></div><div><strong>90</strong><span>Suggested days</span></div><div><strong>2</strong><span>Download editions</span></div></div></div></section>

<section class="section" id="download-editions"><div class="container"><div class="section-head"><span class="section-kicker">Choose Your Edition</span><h2>How Would You Like to Journey?</h2><p>Both editions contain the same guided formation content. Choose the format that best matches how you prefer to write.</p></div><div class="companion-edition-grid">
<article class="companion-edition-card featured"><span class="edition-badge">Recommended for tablets & computers</span><div class="edition-icon">⌨</div><h3>Fillable Digital Journal</h3><p>Type directly inside the PDF, click practice checkboxes, save your progress, and return whenever you are ready.</p><ul><li>Interactive multiline writing fields</li><li>Clickable practice and checkpoint boxes</li><li>Works offline after download</li><li>Your entries stay on your device</li></ul><a class="btn btn-primary companion-download-button" href="${fillableUrl}" download data-companion-download="fillable">Download Fillable PDF ↓</a><small>For best results, download first and open in Adobe Acrobat Reader or another form-compatible PDF app.</small></article>
<article class="companion-edition-card"><span class="edition-badge">Recommended for handwriting</span><div class="edition-icon">✎</div><h3>Print-Ready Personal Journal</h3><p>Download a clean, flattened edition formatted at 7 × 10 inches with writing lines and checkboxes for personal printing.</p><ul><li>No interactive form fields</li><li>Consistent 7 × 10-inch page size</li><li>Clear writing lines and reflection spaces</li><li>Suitable for home or local printing</li></ul><a class="btn btn-secondary companion-download-button" href="${printUrl}" download data-companion-download="print">Download Print Edition ↓</a><small>This is a personal-print interior. Commercial manufacturing may require printer-specific bleed, paper, binding, and cover files.</small></article>
</div><div class="companion-privacy-note"><strong>Your writing is private.</strong><p>The website may record only that an edition was selected when analytics consent has been granted. It cannot see your prayers, journal entries, assessment responses, or anything typed into the downloaded PDF.</p></div></div></section>

<section class="section section-dark" id="inside"><div class="container"><div class="section-head"><span class="section-kicker">Inside Every Chapter</span><h2>A Repeatable Rhythm for Real Formation</h2></div><div class="companion-preview-grid"><article><span>01</span><h3>Chapter Opener</h3><p>Theme, key passage, and supporting Scriptures.</p></article><article><span>02</span><h3>Prepare Your Heart</h3><p>Objectives and a prayer of surrender.</p></article><article><span>03</span><h3>Personal Inventory</h3><p>Questions that locate your present condition.</p></article><article><span>04</span><h3>Guided Reflection</h3><p>Space to respond honestly to the chapter.</p></article><article><span>05</span><h3>Scripture Meditation</h3><p>Observation, understanding, and application.</p></article><article><span>06</span><h3>My Story</h3><p>Trace the evidence of God's work in your life.</p></article><article><span>07</span><h3>Practice</h3><p>Concrete acts that translate truth into obedience.</p></article><article><span>08</span><h3>Declarations</h3><p>Truth-filled statements to read and pray aloud.</p></article><article><span>09</span><h3>Kingdom Journal</h3><p>Record what the Lord is emphasizing now.</p></article><article><span>10</span><h3>Spiritual Checkpoint</h3><p>Rate your response and record a milestone.</p></article></div></div></section>

<section class="section section-light"><div class="container"><div class="section-head"><span class="section-kicker">The Rhythm</span><h2>Read. Reflect. Pray. Practice. Become.</h2></div><div class="grid chapter-grid"><div class="resource-card"><h3>Read</h3><p>Engage the chapter and its key Scriptures with purpose.</p></div><div class="resource-card"><h3>Reflect</h3><p>Identify what God is revealing about your heart and formation.</p></div><div class="resource-card"><h3>Pray</h3><p>Respond through surrender, thanksgiving, petition, and listening.</p></div><div class="resource-card"><h3>Practice</h3><p>Translate insight into a concrete act of obedience.</p></div><div class="resource-card"><h3>Become</h3><p>Track the ongoing transformation of character, identity, and purpose.</p></div></div></div></section>

<section class="section"><div class="container companion-license"><div><span class="section-kicker">Personal-Use License</span><h2>Use It Freely. Share It Responsibly.</h2><p>Your download is for your individual spiritual formation journey. You may save the digital edition on your devices and print one personal copy. The journal may not be resold, redistributed, uploaded, reproduced for groups, or modified for commercial use without written permission from The Gleaning Ground.</p></div><a class="btn btn-secondary" href="/contact">Ask About Group Licensing</a></div></section>
</main>
<footer class="footer"><div class="container"><div class="footer-grid"><div><a class="brand" href="/" style="color:white"><img src="/assets/logo.svg" alt=""><span>The Divine Blueprint</span></a><p>A discipleship initiative of The Gleaning Ground.</p><p>Read. Reflect. Pray. Practice. Become.</p></div><div><h3>Journey</h3><a href="/start-here">Start Here</a><br><a href="/journey">All Chapters</a><br><a href="/bible-studies">Bible Studies</a></div><div><h3>Media</h3><a href="/teachings">Teachings</a><br><a href="/podcast">Podcast</a><br><a href="/companion">The Companion</a></div><div><h3>Connect</h3><a href="/about">About</a><br><a href="/contact">Contact</a><br><a href="/privacy">Privacy & Tracking</a><br><a href="https://gleaningground.com">The Gleaning Ground</a></div></div><div class="footer-bottom"><span>© <span data-year></span> The Divine Blueprint. All rights reserved.</span><span>The Making, Maturing and Manifestation of God's Sons</span></div></div></footer>
<div class="modal" role="dialog" aria-modal="true" aria-label="Book availability"><div class="modal-card"><button class="modal-close" type="button" data-modal-close aria-label="Close">×</button><span class="section-kicker">Store connection</span><h2>Book ordering is ready to connect.</h2><p>Add your final book-ordering link when it becomes available.</p><a class="btn btn-primary" href="/contact">Contact the Ministry</a></div></div>
<script src="/assets/tracking-config.js"></script>
<script src="/assets/script.js"></script>
<script>
(function(){
  document.querySelectorAll('[data-companion-download]').forEach(function(link){
    link.addEventListener('click',function(){
      if(typeof window.trackDivineBlueprintEvent==='function'){
        window.trackDivineBlueprintEvent('resource_opened',{resource_id:'divine-blueprint-companion',resource_type:'journal',edition:link.getAttribute('data-companion-download'),format:'pdf',version:'1.0'});
      }
    });
  });
})();
</script>
</body>
</html>`;

await mkdir(join(root, "assets"), { recursive: true });
const coverBase64 = (await Promise.all(coverParts.map(path => readFile(path, "utf8")))).join("").replace(/\s+/g, "");
await writeFile(coverAssetPath, Buffer.from(coverBase64, "base64"));

await mkdir(cleanDirectory, { recursive: true });
for (const path of pagePaths) await writeFile(path, page, "utf8");

const marker = "/* SINGLE FLAT COVER Companion page */";
const css = `

${marker}
.companion-original-section{background:#fbfaf6;padding:clamp(72px,8vw,118px) 0;overflow:visible}
.companion-original-grid{display:grid;grid-template-columns:minmax(0,.82fr) minmax(300px,1.18fr);gap:clamp(48px,7vw,100px);align-items:center}
.companion-original-copy h1{margin:0 0 1.35rem;color:#0b2b4d;font-family:Georgia,serif;font-size:clamp(3.5rem,6.1vw,5.7rem);line-height:.92;letter-spacing:-.035em}
.companion-original-copy .lead{max-width:620px;margin:0 0 1.8rem;color:#152b43;font-size:1.1rem;line-height:1.65}
.companion-original-list{margin:0 0 2rem;padding:0;list-style:none}.companion-original-list li{margin:.85rem 0;color:#152b43;font-size:1.05rem}
.companion-flat-book{display:flex;align-items:center;justify-content:center;width:100%;margin:0;padding:0;overflow:visible;background:transparent;border:0}
.companion-flat-book-image{display:block;width:min(390px,100%);max-width:100%;height:auto!important;max-height:none!important;aspect-ratio:2/3;object-fit:contain!important;object-position:center;margin:0 auto;padding:0;border:0;border-radius:1px;transform:none!important;clip:auto!important;clip-path:none!important;filter:drop-shadow(16px 22px 24px rgba(7,27,49,.18))}
@media(max-width:860px){.companion-original-grid{grid-template-columns:1fr;text-align:left}.companion-flat-book{justify-content:flex-start}.companion-flat-book-image{width:min(340px,88vw);margin:0}}
@media(max-width:560px){.companion-original-section{padding:58px 0}.companion-original-copy h1{font-size:clamp(3rem,16vw,4.25rem)}.companion-flat-book{justify-content:center}.companion-flat-book-image{margin:0 auto}}
`;

let styles = await readFile(stylesPath, "utf8");
if (styles.includes(marker)) styles = styles.slice(0, styles.indexOf(marker)).replace(/\s+$/, "") + css;
else styles += css;
await writeFile(stylesPath, styles, "utf8");

console.log("Wrote the Companion page with the dedicated Companion Journal cover asset.");
