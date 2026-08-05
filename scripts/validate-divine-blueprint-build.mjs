import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = "_site/divine-blueprint-site";
const styleUrl = "/assets/styles.css?v=20260805-responsive-type-v1";
const typographyVersion = "20260805-responsive-type-v1";
const companionCoverPath = "/assets/companion-journal-cover-v3.webp?v=20260805-ivory-gold-journal";
const requiredFiles = [
  "companion.html",
  "companion/index.html",
  "journey/index.html",
  "bible-studies/index.html",
  "teachings/index.html",
  "assets/divine-blueprint-cover.webp",
  "assets/companion-journal-cover-v3.webp",
  "assets/typography-audit.json",
  "assets/downloads/The-Divine-Blueprint-Companion-Fillable.pdf",
  "assets/downloads/The-Divine-Blueprint-Companion-Print-Ready.pdf"
];

for (const relativePath of requiredFiles) {
  const path = join(root, relativePath);
  if (!existsSync(path)) throw new Error(`Missing required build output: ${path}`);
}

const companionPath = join(root, "companion/index.html");
const companion = await readFile(companionPath, "utf8");
const styles = await readFile(join(root, "assets/styles.css"), "utf8");
const typographyAudit = JSON.parse(await readFile(join(root, "assets/typography-audit.json"), "utf8"));

const requiredCompanionFragments = [
  '<base href="/">',
  `href="${styleUrl}"`,
  'More Than a<br>Journal',
  'class="companion-flat-book"',
  'class="companion-flat-book-image"',
  `src="${companionCoverPath}"`,
  'href="#download-editions">Get the Companion</a>',
  'Download Fillable PDF',
  'Download Print Edition',
  'The-Divine-Blueprint-Companion-Fillable.pdf',
  'The-Divine-Blueprint-Companion-Print-Ready.pdf',
  'href="/journey"',
  'href="/bible-studies"',
  'href="/teachings"'
];

for (const fragment of requiredCompanionFragments) {
  if (!companion.includes(fragment)) throw new Error(`Companion page is missing: ${fragment}`);
}

const coverTag = companion.match(
  /<img\b[^>]*class=["'][^"']*\bcompanion-flat-book-image\b[^"']*["'][^>]*>/i
)?.[0] || "";
if (!coverTag) throw new Error("Companion page is missing the flat cover image tag.");
if (!/\bwidth=["']512["']/.test(coverTag) || !/\bheight=["']768["']/.test(coverTag)) {
  throw new Error(`Companion cover dimensions are incorrect: ${coverTag}`);
}

const singleCoverCount = (companion.match(/class="companion-flat-book-image"/g) || []).length;
if (singleCoverCount !== 1) {
  throw new Error(`Companion page contains ${singleCoverCount} flat covers; expected exactly one.`);
}

const forbiddenCompanionClasses = [
  "companion-cover-visual",
  "companion-book-cover-visual",
  "journal-visual",
  "open-journal",
  "closed-journal",
  "journal-lines",
  "divine-blueprint-full-cover"
];

for (const className of forbiddenCompanionClasses) {
  const pattern = new RegExp(`class=["'][^"']*\\b${className}\\b`, "i");
  if (pattern.test(companion)) throw new Error(`Legacy or duplicate Companion visual remains: ${className}`);
}

if (/canonical-book-cover\.js|divine-blueprint-cover-final\.js|companion-cover-display\.js/i.test(companion)) {
  throw new Error("A cover-manipulation runtime script remains on the Companion page.");
}
if (!styles.includes("SINGLE FLAT COVER Companion page")) {
  throw new Error("Single flat-cover Companion CSS is missing.");
}
if (!styles.includes("object-fit:contain!important")) {
  throw new Error("The flat cover is not protected from cropping.");
}
if (/<[^>]*data-modal-open[^>]*>[^<]*Get the Companion/i.test(companion)) {
  throw new Error("Get the Companion is still connected to the store modal.");
}

if (!styles.includes("RESPONSIVE TYPOGRAPHY AUDIT: START") || !styles.includes("RESPONSIVE TYPOGRAPHY AUDIT: END")) {
  throw new Error("The site-wide responsive typography layer is missing.");
}
if (typographyAudit.version !== typographyVersion || !Array.isArray(typographyAudit.pages)) {
  throw new Error("The typography audit report is missing or has the wrong version.");
}

const failures = [];
let htmlPageCount = 0;

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    htmlPageCount += 1;
    const pagePath = relative(root, path).replaceAll("\\", "/");
    const isHomepage = pagePath === "index.html";
    const html = await readFile(path, "utf8");

    if (/href=["']\/?divine-blueprint-site\//i.test(html)) {
      failures.push(`${path}: exposes internal folder in a public link`);
    }
    if (!html.includes(`href="${styleUrl}"`)) {
      failures.push(`${path}: stylesheet reference is not cache-busted for responsive typography`);
    }
    if (!html.includes(`data-typography-audit="${typographyVersion}"`)) {
      failures.push(`${path}: typography audit marker is missing`);
    }
    if (!/<meta\b[^>]*name=(['"])viewport\1/i.test(html)) {
      failures.push(`${path}: responsive viewport metadata is missing`);
    }

    for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
      const src = tag.match(/\bsrc=(["'])(.*?)\1/i)?.[2] || "";
      const identity = tag.toLowerCase();
      const isCompanionJournalCover = identity.includes("companion-flat-book-image");
      const isHomepageMockup = isHomepage || identity.includes("home-mockup") || identity.includes("homepage-book");
      const isBookCover = !isHomepageMockup && (
        identity.includes("divine blueprint book cover") ||
        identity.includes("hero-book-cover-image") ||
        identity.includes("canonical-book-cover-image")
      );
      if (isCompanionJournalCover && !src.startsWith("/assets/companion-journal-cover-v3.webp")) {
        failures.push(`${path}: incorrect Companion Journal cover ${src}`);
      } else if (isBookCover && !src.startsWith("/assets/divine-blueprint-cover.webp")) {
        failures.push(`${path}: non-canonical book cover ${src}`);
      }
    }
  }
}

await walk(root);

if (typographyAudit.pageCount !== htmlPageCount || typographyAudit.pages.length !== htmlPageCount) {
  failures.push(`Typography audit covers ${typographyAudit.pages.length} pages, but the build contains ${htmlPageCount} HTML pages.`);
}

if (failures.length) throw new Error(failures.join("\n"));
console.log(`Validated ${htmlPageCount} responsive Divine Blueprint pages, the approved Companion Journal cover, and clean public routes.`);
