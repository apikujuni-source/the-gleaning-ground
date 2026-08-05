import { readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const sourceDirectory = ".source/divine-blueprint/companion-journal-cover-v3-base64";
const sourceChunkPaths = ["00.txt", "01.txt", "02.txt", "03.txt"].map(
  (name) => join(sourceDirectory, name)
);
const outputCover = join(siteRoot, "assets", "companion-journal-cover-v3.webp");
const settingsPath = "content/page-settings/divine/companion.json";
const publicCoverPath = "/assets/companion-journal-cover-v3.webp?v=20260805-ivory-gold-journal";
const coverWidth = 512;
const coverHeight = 768;
const expectedBase64Length = 58068;
const expectedFileSize = 43550;
const expectedSha256 = "751330a42b1b27a86b31a4cd28cf4d0f5c3aed2e4acc1a43612949048e12196f";
const pagePaths = [
  join(siteRoot, "companion.html"),
  join(siteRoot, "companion", "index.html")
];

function updateCompanionImages(page) {
  let updated = 0;
  for (const section of page.sections || []) {
    for (const image of section.imageFields || []) {
      if (!String(image.src || "").includes("companion-journal-cover")) continue;
      image.src = publicCoverPath;
      image.alt = "The Divine Blueprint Companion Journal cover by Ayo-Paul Ikujuni";
      updated += 1;
    }
  }
  return updated;
}

function updateEmbeddedCmsPageData(html, pagePath) {
  let embeddedImagesUpdated = 0;
  let embeddedDataFound = false;

  const updatedHtml = html.replace(
    /<script\b([^>]*\bid=["']cms-page-data["'][^>]*)>([\s\S]*?)<\/script>/i,
    (match, attributes, jsonText) => {
      embeddedDataFound = true;
      let page;
      try {
        page = JSON.parse(jsonText);
      } catch (error) {
        throw new Error(`Could not parse embedded CMS page data in ${pagePath}: ${error.message}`);
      }

      embeddedImagesUpdated = updateCompanionImages(page);
      const safeJson = JSON.stringify(page).replace(/</g, "\\u003c");
      return `<script${attributes}>${safeJson}</script>`;
    }
  );

  if (!embeddedDataFound) {
    throw new Error(`Embedded CMS page data was not found in ${pagePath}.`);
  }
  if (embeddedImagesUpdated !== 1) {
    throw new Error(
      `Expected one embedded Companion cover setting in ${pagePath}; updated ${embeddedImagesUpdated}.`
    );
  }

  return updatedHtml;
}

const encodedChunks = await Promise.all(
  sourceChunkPaths.map(async (path) => (await readFile(path, "utf8")).trim())
);
const encoded = encodedChunks.join("");
if (encoded.length !== expectedBase64Length) {
  throw new Error(
    `Unexpected Companion cover source length: ${encoded.length}; expected ${expectedBase64Length}.`
  );
}

const source = Buffer.from(encoded, "base64");
const signature = source.subarray(0, 12).toString("ascii");
const sha256 = createHash("sha256").update(source).digest("hex");

if (source.length !== expectedFileSize) {
  throw new Error(`Unexpected Companion cover file size: ${source.length}; expected ${expectedFileSize}.`);
}
if (!signature.startsWith("RIFF") || !signature.endsWith("WEBP")) {
  throw new Error("The approved Companion cover is not a valid WebP image.");
}
if (sha256 !== expectedSha256) {
  throw new Error(`Unexpected Companion cover checksum: ${sha256}`);
}

await writeFile(outputCover, source);
const installed = await stat(outputCover);
if (installed.size !== expectedFileSize) {
  throw new Error(`Installed Companion cover size mismatch: ${installed.size}.`);
}

const settings = JSON.parse(await readFile(settingsPath, "utf8"));
const settingsImagesUpdated = updateCompanionImages(settings);
if (settingsImagesUpdated !== 1) {
  throw new Error(`Expected one Companion cover setting; updated ${settingsImagesUpdated}.`);
}
await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

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
        updated = updated.replace(/\bwidth=["'][^"']*["']/, `width="${coverWidth}"`);
      } else {
        updated = updated.replace(/>$/, ` width="${coverWidth}">`);
      }

      if (/\bheight=["'][^"']*["']/.test(updated)) {
        updated = updated.replace(/\bheight=["'][^"']*["']/, `height="${coverHeight}"`);
      } else {
        updated = updated.replace(/>$/, ` height="${coverHeight}">`);
      }

      if (/\balt=["'][^"']*["']/.test(updated)) {
        updated = updated.replace(
          /\balt=["'][^"']*["']/,
          'alt="The Divine Blueprint Companion Journal cover by Ayo-Paul Ikujuni"'
        );
      }

      return updated;
    }
  );

  html = updateEmbeddedCmsPageData(html, pagePath);

  const coverReferenceCount = html.split(publicCoverPath).length - 1;
  if (!replaced || coverReferenceCount < 2) {
    throw new Error(
      `Could not fully replace the Companion cover in ${pagePath}; found ${coverReferenceCount} approved references.`
    );
  }

  await writeFile(pagePath, html, "utf8");
}

await writeFile(
  join(siteRoot, "companion-cover-status.txt"),
  [
    "COMPANION_COVER=APPROVED_IVORY_GOLD_JOURNAL",
    "VERSION=2026-08-05-5",
    `SOURCE=${sourceDirectory}`,
    `PUBLIC_ASSET=${publicCoverPath}`,
    `DIMENSIONS=${coverWidth}x${coverHeight}`,
    `SHA256=${expectedSha256}`,
    "CMS_RUNTIME_IMAGE=APPROVED_IVORY_GOLD_JOURNAL"
  ].join("\n") + "\n",
  "utf8"
);

console.log(
  "Installed the approved ivory-and-gold Companion Journal cover in both static markup and embedded CMS page data."
);
