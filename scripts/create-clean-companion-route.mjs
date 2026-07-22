import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const sourcePath = join(siteRoot, "companion.html");
const cleanDirectory = join(siteRoot, "companion");
const cleanPath = join(cleanDirectory, "index.html");
const stylesPath = join(siteRoot, "assets", "styles.css");

let companionHtml = await readFile(sourcePath, "utf8");

const fillablePath = "/assets/downloads/The-Divine-Blueprint-Companion-Fillable.pdf";
const printPath = "/assets/downloads/The-Divine-Blueprint-Companion-Print-Ready.pdf";
const existingDownloadTarget = companionHtml.includes('id="download-editions"')
  ? "download-editions"
  : "companion-downloads";

// Replace only the page-level "Get the Companion" control. It must never
// inherit the generic data-modal-open behavior used by "Get the Book".
companionHtml = companionHtml.replace(
  /<(?:button|a)\b([^>]*)>\s*Get the Companion\s*<\/(?:button|a)>/gi,
  (_match, attrs) => {
    const classMatch = attrs.match(/class=(['"])(.*?)\1/i);
    const className = classMatch ? classMatch[2] : "btn btn-primary";
    return `<a class="${className}" href="#${existingDownloadTarget}">Get the Companion</a>`;
  }
);

// The original Companion page does not contain download choices. Add them
// without replacing its current hero, feature list, or journal mockup.
if (!companionHtml.includes('id="download-editions"') && !companionHtml.includes('id="companion-downloads"')) {
  const downloadSection = `
<section class="section companion-download-section" id="companion-downloads" aria-labelledby="companion-download-title">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">Choose Your Edition</span>
      <h2 id="companion-download-title">Download the Companion Journal</h2>
      <p>Choose the edition that best matches how you prefer to complete your formation journey.</p>
    </div>
    <div class="companion-download-grid">
      <article class="companion-download-card companion-download-card-featured">
        <span class="companion-download-label">For computer or tablet</span>
        <h3>Fillable Digital Journal</h3>
        <p>Type directly into the guided reflection areas, select checkboxes, save your responses, and continue later.</p>
        <ul class="list-check">
          <li>Interactive writing fields</li>
          <li>Clickable practices and checkpoints</li>
          <li>Works offline after download</li>
          <li>Your entries remain on your device</li>
        </ul>
        <a class="btn btn-primary" href="${fillablePath}" download data-companion-download="fillable">Download Fillable PDF ↓</a>
        <small>Download the file first, then open it in Adobe Acrobat Reader or another form-compatible PDF application.</small>
      </article>
      <article class="companion-download-card">
        <span class="companion-download-label">For handwriting</span>
        <h3>Print-Ready Personal Journal</h3>
        <p>Print the 7 × 10-inch journal and complete every reflection, prayer, practice, and milestone by hand.</p>
        <ul class="list-check">
          <li>Clean, flattened pages</li>
          <li>Writing lines and checkboxes</li>
          <li>Suitable for personal printing</li>
          <li>Same complete formation content</li>
        </ul>
        <a class="btn btn-secondary" href="${printPath}" download data-companion-download="print">Download Print-Ready PDF ↓</a>
        <small>This personal-print edition is separate from any printer-specific commercial manufacturing file.</small>
      </article>
    </div>
    <div class="companion-download-privacy">
      <strong>Your writing remains private.</strong>
      <p>The website cannot read journal entries, prayers, assessment responses, or anything typed into the downloaded PDF.</p>
    </div>
  </div>
</section>`;

  companionHtml = companionHtml.replace("</main>", `${downloadSection}\n</main>`);
}

// A clean /companion URL is one level below the virtual subdomain root.
// Using an explicit base keeps every stylesheet, script, image and download
// anchored to https://divineblueprint.gleaningground.com/.
if (!companionHtml.includes('<base href="/">')) {
  companionHtml = companionHtml.replace(
    "<head>",
    '<head>\n<base href="/">\n<link rel="canonical" href="https://divineblueprint.gleaningground.com/companion">'
  );
}

await writeFile(sourcePath, companionHtml, "utf8");
await mkdir(cleanDirectory, { recursive: true });
await writeFile(cleanPath, companionHtml, "utf8");

const cssMarker = "/* Companion CTA Download Section */";
let styles = await readFile(stylesPath, "utf8");
if (!styles.includes(cssMarker)) {
  styles += `

${cssMarker}
html{scroll-behavior:smooth}
.companion-download-section{background:#f6f0e5;border-top:1px solid rgba(186,132,43,.22)}
.companion-download-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px;align-items:stretch;margin-top:34px}
.companion-download-card{display:flex;flex-direction:column;gap:16px;padding:34px;border:1px solid rgba(14,45,77,.16);border-radius:18px;background:#fffdf8;box-shadow:0 18px 45px rgba(14,45,77,.08)}
.companion-download-card-featured{border-color:#b9872c;box-shadow:0 22px 55px rgba(14,45,77,.12)}
.companion-download-card h3{font-size:clamp(1.6rem,3vw,2.25rem);margin:0;color:#0e2d4d}
.companion-download-card p{margin:0}
.companion-download-card .btn{align-self:flex-start;margin-top:auto}
.companion-download-card small{display:block;color:#5d6670;line-height:1.55}
.companion-download-label{display:inline-flex;align-self:flex-start;padding:7px 12px;border-radius:999px;background:#efe1c3;color:#795615;font-size:.78rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.companion-download-privacy{margin-top:28px;padding:22px 26px;border-left:4px solid #b9872c;background:#fffdf8}
.companion-download-privacy p{margin:.4rem 0 0}
@media (max-width:760px){.companion-download-grid{grid-template-columns:1fr}.companion-download-card{padding:26px}}
`;
  await writeFile(stylesPath, styles, "utf8");
}

// Make navigation use the public clean route instead of exposing the
// generated companion.html filename.
async function normalizeCompanionLinks(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await normalizeCompanionLinks(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const html = await readFile(path, "utf8");
    const updated = html
      .replaceAll('href="companion.html"', 'href="/companion"')
      .replaceAll("href='companion.html'", "href='/companion'")
      .replaceAll('href="./companion.html"', 'href="/companion"')
      .replaceAll("href='./companion.html'", "href='/companion'");
    if (updated !== html) await writeFile(path, updated, "utf8");
  }
}

await normalizeCompanionLinks(siteRoot);
console.log(`Connected Get the Companion to PDF choices and created ${cleanPath}.`);
