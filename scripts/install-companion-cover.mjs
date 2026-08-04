import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const sourcePath = resolve("content/assets/companion-journal-cover.webp");
const siteRoot = resolve("_site/divine-blueprint-site");
const destinationPath = resolve(siteRoot, "assets/companion-journal-cover.webp");
const settingsPath = resolve("content/page-settings/divine/companion.json");
const publicSrc = "/assets/companion-journal-cover.webp?v=20260804-navy-gold";
const expectedSha256 = "4b64b2102a87bbd26b80eb1d071d29cfd3a6c364a528e116c845ede24a01ea0d";

const source = await readFile(sourcePath);
const signature = source.subarray(0, 12).toString("ascii");
const sha256 = createHash("sha256").update(source).digest("hex");

if (!signature.startsWith("RIFF") || !signature.endsWith("WEBP")) {
  throw new Error("The Companion cover source is not a valid WebP image.");
}
if (sha256 !== expectedSha256) {
  throw new Error(`Unexpected Companion cover checksum: ${sha256}`);
}

await mkdir(dirname(destinationPath), { recursive: true });
await copyFile(sourcePath, destinationPath);

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
  publicImagesUpdated += (html.match(new RegExp(publicSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  await writeFile(pagePath, html, "utf8");
}

const installed = await stat(destinationPath);
if (installed.size !== source.length) {
  throw new Error(`Installed Companion cover size mismatch: ${installed.size} versus ${source.length}.`);
}

console.log(
  `Installed the navy-and-gold Companion cover (${source.length} bytes) and updated ${publicImagesUpdated} public reference(s).`
);
