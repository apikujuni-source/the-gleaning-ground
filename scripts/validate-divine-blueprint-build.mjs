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
  "assets/divine-blueprint-cover-final.js",
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
  'class="divine-blueprint-full-cover"',
  'class="divine-blueprint-full-cover-image canonical-book-cover-image"',
  'src="/assets/divine-blueprint-cover.webp?v=20260723-final-cover"',
  'width="1024" height="1536"',
  '/assets/divine-blueprint-cover-final.js?v=20260723',
  'Download Fillable PDF',
  'The-Divine-Blueprint-Companion-Print-Ready.pdf',
  'href="/journey"',
  'href="/bible-studies"',
  'href="/teachings"'
];

for (const fragment of requiredCompanionFragments) {
  if (!companion.includes(fragment)) throw new Error(`Companion page is missing: ${fragment}`);
}

const forbiddenCompanionClasses = [
  "companion-cover-visual",
  "companion-book-cover-visual",
  "journal-visual",
  "open-journal",
  "closed-journal",
  "journal-lines"
];

for (const className of forbiddenCompanionClasses) {
  const pattern = new RegExp(`class=["'][^"']*\\b${className}\\b`, "i");
  if (pattern.test(companion)) throw new Error(`Legacy Companion visual remains: ${className}`);
}

if (!styles.includes("FINAL Divine Blueprint full-cover rules")) {
  throw new Error("Final full-cover CSS rules are missing.");
}
if (!styles.includes("object-fit:contain!important")) {
  throw new Error("The cover is not protected from cropping.");
}
if (/<[^>]*data-modal-open[^>]*>[^<]*Get the Companion/i.test(companion)) {
  throw new Error("Get the Companion is still connected to the store modal.");
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
        identity.includes("divine-blueprint-full-cover-image");
      if (isBookCover && !src.startsWith("/assets/divine-blueprint-cover.webp")) {
        failures.push(`${path}: non-canonical book cover ${src}`);
      }
    }
  }
}

await walk(root);
if (failures.length) throw new Error(failures.join("\n"));
console.log("Validated complete uncropped cover, fresh stylesheet, Companion downloads, and clean routes.");
