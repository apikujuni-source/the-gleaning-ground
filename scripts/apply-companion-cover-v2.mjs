import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const sourceCover = ".source/divine-blueprint/companion-journal-cover-v2.webp";
const publicCoverPath = "/assets/companion-journal-cover-v2.webp?v=20260804-sharp-cover";
const outputCover = join(siteRoot, "assets", "companion-journal-cover-v2.webp");
const pagePaths = [
  join(siteRoot, "companion.html"),
  join(siteRoot, "companion", "index.html")
];

await copyFile(sourceCover, outputCover);

for (const pagePath of pagePaths) {
  let html = await readFile(pagePath, "utf8");
  let replaced = false;

  html = html.replace(
    /<img\b[^>]*class=["'][^"']*companion-flat-book-image[^"']*["'][^>]*>/i,
    (tag) => {
      replaced = true;
      let updated = tag;

      if (/\bsrc=["'][^"']*["']/.test(updated)) {
        updated = updated.replace(/\bsrc=["'][^"']*["']/, `src="${publicCoverPath}"`);
      } else {
        updated = updated.replace(/>$/, ` src="${publicCoverPath}">`);
      }

      if (/\bwidth=["'][^"']*["']/.test(updated)) {
        updated = updated.replace(/\bwidth=["'][^"']*["']/, 'width="640"');
      } else {
        updated = updated.replace(/>$/, ' width="640">');
      }

      if (/\bheight=["'][^"']*["']/.test(updated)) {
        updated = updated.replace(/\bheight=["'][^"']*["']/, 'height="995"');
      } else {
        updated = updated.replace(/>$/, ' height="995">');
      }

      return updated;
    }
  );

  if (!replaced || !html.includes(publicCoverPath)) {
    throw new Error(`Could not replace the Companion cover in ${pagePath}.`);
  }

  await writeFile(pagePath, html, "utf8");
}

await writeFile(
  join(siteRoot, "companion-cover-status.txt"),
  [
    "COMPANION_COVER=SHARP_GENERATED_IMAGE",
    "VERSION=2026-08-04-1",
    `PUBLIC_ASSET=${publicCoverPath}`,
    "DIMENSIONS=640x995"
  ].join("\n") + "\n",
  "utf8"
);

console.log("Installed the sharp generated Companion Journal cover on both Companion routes.");
