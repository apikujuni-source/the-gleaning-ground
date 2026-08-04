import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const sourceDirectory = resolve("content/assets/companion-cover-base64");
const sourceChunkPaths = ["00.txt", "01.txt", "02.txt", "03.txt"].map((name) =>
  resolve(sourceDirectory, name)
);
const siteRoot = resolve("_site/divine-blueprint-site");
const destinationPath = resolve(siteRoot, "assets/companion-journal-cover.webp");
const settingsPath = resolve("content/page-settings/divine/companion.json");
const publicSrc = "/assets/companion-journal-cover.webp?v=20260804-navy-gold-v2";
const expectedBase64Length = 23660;
const expectedFileSize = 17744;
const expectedSha256 = "d0a71b672d8b9e75c02ce69af709ed76bc66244d72f4cec1b7559b5a595ed16e";

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
  throw new Error("The reconstructed Companion cover is not a valid WebP image.");
}
if (sha256 !== expectedSha256) {
  throw new Error(`Unexpected Companion cover checksum: ${sha256}`);
}

await mkdir(dirname(destinationPath), { recursive: true });
await writeFile(destinationPath, source);

const settings = JSON.parse(await readFile(settingsPath, "utf8"));
let settingsImagesUpdated = 0;
for (const section of settings.sections || []) {
  for (const image of section.imageFields || []) {
    if (!String(image.src || "").includes("companion-journal-cover.webp")) continue;
    image.src = publicSrc;
    image.alt = "The Divine Blueprint Companion Journal cover by Ayo-Paul Ikujuni";
    settingsImagesUpdated += 1;
  }
}
if (settingsImagesUpdated !== 1) {
  throw new Error(`Expected one Companion cover setting; updated ${settingsImagesUpdated}.`);
}
await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

const pagePaths = [
  resolve(siteRoot, "companion.html"),
  resolve(siteRoot, "companion/index.html")
];
let publicImagesUpdated = 0;
for (const pagePath of pagePaths) {
  let html = await readFile(pagePath, "utf8");
  const before = html;
  html = html.replace(
    /\/assets\/companion-journal-cover\.webp(?:\?[^"'<>\s]*)?/g,
    publicSrc
  );
  if (html === before || !html.includes(publicSrc)) {
    throw new Error(`Could not install the new Companion cover reference in ${pagePath}.`);
  }
  publicImagesUpdated += (
    html.match(new RegExp(publicSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []
  ).length;
  await writeFile(pagePath, html, "utf8");
}

const installed = await stat(destinationPath);
if (installed.size !== source.length) {
  throw new Error(`Installed Companion cover size mismatch: ${installed.size} versus ${source.length}.`);
}

console.log(
  `Installed the verified navy-and-gold Companion cover (${source.length} bytes) and updated ${publicImagesUpdated} public reference(s).`
);
