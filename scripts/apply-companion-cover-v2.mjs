import { access, copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const generatedSourceCover = ".source/divine-blueprint/companion-journal-cover-v2.webp";
const verifiedInstalledCover = join(siteRoot, "assets", "companion-journal-cover.webp");
const publicCoverPath = "/assets/companion-journal-cover-v2.webp?v=20260804-sharp-cover";
const outputCover = join(siteRoot, "assets", "companion-journal-cover-v2.webp");
const pagePaths = [
  join(siteRoot, "companion.html"),
  join(siteRoot, "companion", "index.html")
];

async function firstAvailable(paths) {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch (error) {
      if (error && error.code !== "ENOENT") throw error;
    }
  }

  throw new Error(
    `No Companion cover source was found. Checked: ${paths.join(", ")}`
  );
}

// The standalone v2 source is optional. The preceding install-companion-cover
// build step always reconstructs and verifies the canonical navy-and-gold WebP,
// so use that generated asset when the optional source file is not committed.
const sourceCover = await firstAvailable([
  generatedSourceCover,
  verifiedInstalledCover
]);

await copyFile(sourceCover, outputCover);

const installedCover = await readFile(outputCover);
const signature = installedCover.subarray(0, 12).toString("ascii");
if (installedCover.length < 12 || !signature.startsWith("RIFF") || !signature.endsWith("WEBP")) {
  throw new Error(`The Companion cover copied from ${sourceCover} is not a valid WebP image.`);
}

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
    "VERSION=2026-08-04-2",
    `SOURCE=${sourceCover}`,
    `PUBLIC_ASSET=${publicCoverPath}`,
    "DIMENSIONS=640x995"
  ].join("\n") + "\n",
  "utf8"
);

console.log(
  `Installed the Companion Journal cover from ${sourceCover} on both Companion routes.`
);
