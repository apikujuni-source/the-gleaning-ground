import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const chunksDir = ".source/divine-blueprint-cover/chunks";
const chunkNames = ["00", "01", "02", "03", "04", "05a", "05b"];
const outputImage = join(siteRoot, "assets/divine-blueprint-cover.webp");
const mockupChunksDir = ".source/divine-blueprint-home-mockup/chunks";
const mockupChunkNames = ["00", "01", "02", "03", "04", "05a", "05b"];
const mockupOutputImage = join(siteRoot, "assets/divine-blueprint-home-mockup-final.webp");
const originalChunksDir = ".source/divine-blueprint-home-original/chunks";
const originalChunkNames = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];
const originalOutputImage = join(siteRoot, "assets/divine-blueprint-home-mockup-47e42f5d.png");
const indexPath = join(siteRoot, "index.html");
const stylesPath = join(siteRoot, "assets/styles.css");

for (const name of chunkNames) {
  const path = join(chunksDir, name);
  if (!existsSync(path)) throw new Error(`Missing Divine Blueprint cover chunk: ${path}`);
}
for (const name of mockupChunkNames) {
  const path = join(mockupChunksDir, name);
  if (!existsSync(path)) throw new Error(`Missing Divine Blueprint homepage mockup chunk: ${path}`);
}
for (const name of originalChunkNames) {
  const path = join(originalChunksDir, name);
  if (!existsSync(path)) throw new Error(`Missing original homepage PNG chunk: ${path}`);
}
if (!existsSync(indexPath) || !existsSync(stylesPath)) {
  throw new Error("Divine Blueprint website package was not extracted before applying the cover.");
}

const encoded = (await Promise.all(
  chunkNames.map((name) => readFile(join(chunksDir, name), "utf8"))
)).join("").replace(/\s+/g, "");

const image = Buffer.from(encoded, "base64");
if (
  image.length < 10000 ||
  image.subarray(0, 4).toString("ascii") !== "RIFF" ||
  image.subarray(8, 12).toString("ascii") !== "WEBP"
) {
  throw new Error("Decoded Divine Blueprint cover is not a valid WebP image.");
}

await mkdir(join(siteRoot, "assets"), { recursive: true });
await writeFile(outputImage, image);

const mockupEncoded = (await Promise.all(
  mockupChunkNames.map((name) => readFile(join(mockupChunksDir, name), "utf8"))
)).join("").replace(/\s+/g, "");
const mockupImage = Buffer.from(mockupEncoded, "base64");
if (
  mockupImage.length < 10000 ||
  mockupImage.subarray(0, 4).toString("ascii") !== "RIFF" ||
  mockupImage.subarray(8, 12).toString("ascii") !== "WEBP"
) {
  throw new Error("Decoded Divine Blueprint homepage mockup is not a valid WebP image.");
}
await writeFile(mockupOutputImage, mockupImage);

const originalEncoded = (await Promise.all(
  originalChunkNames.map((name) => readFile(join(originalChunksDir, name), "utf8"))
)).join("").replace(/\s+/g, "");
const originalImage = Buffer.from(originalEncoded, "base64");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (
  originalImage.length !== 3128539 ||
  !originalImage.subarray(0, 8).equals(pngSignature)
) {
  throw new Error(`Original homepage PNG failed validation (${originalImage.length} bytes).`);
}
await writeFile(originalOutputImage, originalImage);

const oldHero = `<div class="hero-art" aria-label="The Divine Blueprint book concept">
      <div class="light-orb"></div>
      <div class="book-mockup">
        <div>
          <img class="book-mark" src="assets/logo.svg" alt="">
          <div class="book-title">THE DIVINE<br>BLUEPRINT</div>
          <div class="book-sub">The Making, Maturing and Manifestation of God’s Sons</div>
        </div>
      </div>
    </div>`;

const newHero = `<div class="hero-art hero-book-cover" aria-label="The Divine Blueprint book cover">
      <div class="light-orb"></div>
      <img class="hero-book-cover-image" src="assets/divine-blueprint-home-mockup-47e42f5d.png" alt="The Divine Blueprint by Ayo-Paul Ikujuni book cover" width="1122" height="1402" loading="eager" fetchpriority="high" decoding="async">
    </div>`;

let index = await readFile(indexPath, "utf8");
if (!index.includes("hero-book-cover-image")) {
  if (!index.includes(oldHero)) throw new Error("Could not find the existing Divine Blueprint book mockup.");
  index = index.replace(oldHero, newHero);
}
if (!index.includes('rel="preload" as="image" href="assets/divine-blueprint-home-mockup-47e42f5d.png"')) {
  index = index.replace("</head>", '  <link rel="preload" as="image" href="assets/divine-blueprint-home-mockup-47e42f5d.png" fetchpriority="high">\n</head>');
}
await writeFile(indexPath, index, "utf8");

const coverCss = `

/* Uploaded Divine Blueprint cover */
.hero-book-cover{position:relative;isolation:isolate}
.hero-book-cover .light-orb{z-index:0}
.hero-book-cover-image{position:relative;z-index:1;display:block;width:min(430px,92%);height:auto;max-height:600px;object-fit:contain;filter:drop-shadow(24px 30px 32px rgba(7,26,48,.28));transform:rotate(-1deg);border-radius:2px}
@media (max-width:700px){.hero-book-cover-image{width:min(360px,90%);max-height:520px}}
`;

let styles = await readFile(stylesPath, "utf8");
if (!styles.includes(".hero-book-cover-image")) {
  styles += coverCss;
  await writeFile(stylesPath, styles, "utf8");
}

console.log(`Applied Divine Blueprint cover (${image.length} bytes).`);
