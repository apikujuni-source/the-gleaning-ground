import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = "_site/divine-blueprint-site";
const requiredFiles = [
  "companion.html",
  "companion/index.html",
  "journey/index.html",
  "bible-studies/index.html",
  "teachings/index.html",
  "assets/divine-blueprint-cover.webp",
  "assets/downloads/The-Divine-Blueprint-Companion-Fillable.pdf",
  "assets/downloads/The-Divine-Blueprint-Companion-Print-Ready.pdf"
];

for (const relative of requiredFiles) {
  const path = join(root, relative);
  if (!existsSync(path)) throw new Error(`Missing required build output: ${path}`);
}

const companionPath = join(root, "companion/index.html");
const companion = await readFile(companionPath, "utf8");
const styles = await readFile(join(root, "assets/styles.css"), "utf8");

const requiredCompanionFragments = [
  '<base href="/">',
  'href="/assets/styles.css?v=20260723-cover-final"',
  'class="section companion-original-section"',
  'id="companion-original-title">More Than a<br>Journal</h1>',
  'class="companion-flat-book"',
  'class="companion-flat-book-image"',
  'src="/assets/divine-blueprint-cover.webp?v=20260723-flat-original"',
  'width="1024" height="1536"',
  'href="#download-editions">Get the Companion</a>',
  'Download Fillable PDF',
  'The-Divine-Blueprint-Companion-Print-Ready.pdf',
  'href="/journey"',
  'href="/bible-studies"',
  'href="/teachings"'
];

for (const fragment of requiredCompanionFragments) {
  if (!companion.includes(fragment)) throw new Error(`Companion page is missing: ${fragment}`);
}

const flatCoverCount = (companion.match(/class="companion-flat-book-image"/g) || []).length;
if (flatCoverCount !== 1) {
  throw new Error(`Companion page has ${flatCoverCount} flat book images; expected exactly one.`);
}

const forbiddenCompanionClasses = [
  "companion-cover-visual",
  "companion-book-cover-visual",
  "divine-blueprint-full-cover",
  "journal-visual",
  "open-journal",
  "closed-journal",
  "journal-lines"
];

for (const className of forbiddenCompanionClasses) {
  const pattern = new RegExp(`class=["'][^"']*\\b${className}\\b`, "i");
  if (pattern.test(companion)) throw new Error(`Legacy or duplicate Companion visual remains: ${className}`);
}

if (!styles.includes("RESTORED original Companion page with one flat cover")) {
  throw new Error("The original Companion layout CSS is missing.");
}
if (!styles.includes(".companion-flat-book-image")) {
  throw new Error("The flat book image styling is missing.");
}
if (!styles.includes("object-fit:contain")) {
  throw new Error("The flat cover is not protected from cropping.");
}
if (/<[^>]*data-modal-open[^>]*>[^<]*Get the Companion/i.test(companion)) {
  throw new Error("Get the Companion is still connected to the store modal.");
}
if (/canonical-book-cover|divine-blueprint-cover-final|companion-cover-display/i.test(companion)) {
  throw new Error("A cover-manipulation runtime remains on the Companion page.");
}

const failures = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    const html = await readFile(path, "utf8");
    if (/href=["']\/?divine-blueprint-site\//i.test(html)) {
      failures.push(`${path}: exposes internal folder in a public link`);
    }
    if (!html.includes('href="/assets/styles.css?v=20260723-cover-final"')) {
      failures.push(`${path}: stylesheet reference is not cache-busted`);
    }

    for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
      const src = tag.match(/\bsrc=(['"])(.*?)\1/i)?.[2] || "";
      const identity = tag.toLowerCase();
      const isBookCover = identity.includes("divine blueprint book cover") ||
        identity.includes("hero-book-cover-image") ||
        identity.includes("canonical-book-cover-image") ||
        identity.includes("companion-flat-book-image");
      if (isBookCover && !src.startsWith("/assets/divine-blueprint-cover.webp") && !src.startsWith("assets/divine-blueprint-cover.webp")) {
        failures.push(`${path}: non-canonical book cover ${src}`);
      }
    }
  }
}

await walk(root);
if (failures.length) throw new Error(failures.join("\n"));
console.log("Validated original Companion design, exactly one flat cover, fresh stylesheet, downloads, and clean routes.");
