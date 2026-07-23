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
  'More Than a<br>Journal',
  'class="companion-flat-book"',
  'class="companion-flat-book-image"',
  'src="/assets/divine-blueprint-cover.webp?v=20260723-single-flat"',
  'width="1024" height="1536"',
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
      const src = tag.match(/\bsrc=(["'])(.*?)\1/i)?.[2] || "";
      const identity = tag.toLowerCase();
      const isBookCover = identity.includes("divine blueprint book cover") ||
        identity.includes("hero-book-cover-image") ||
        identity.includes("canonical-book-cover-image") ||
        identity.includes("companion-flat-book-image");
      if (isBookCover && !src.startsWith("/assets/divine-blueprint-cover.webp")) {
        failures.push(`${path}: non-canonical book cover ${src}`);
      }
    }
  }
}

await walk(root);
if (failures.length) throw new Error(failures.join("\n"));
console.log("Validated simplified Companion page with one flat cover, working downloads, and clean routes.");
