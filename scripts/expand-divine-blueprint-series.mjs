import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const seriesRoot = "content/divine-blueprint/teaching-series";
const chapterRoot = "content/divine-blueprint/chapters";
const teachingRoot = "content/divine-blueprint/teachings";
const generatedPrefix = "_series-";

await mkdir(teachingRoot, { recursive: true });

for (const name of await readdir(teachingRoot)) {
  if (name.startsWith(generatedPrefix) && name.endsWith(".json")) {
    await rm(join(teachingRoot, name), { force: true });
  }
}

if (!existsSync(seriesRoot)) {
  throw new Error(`Missing consolidated Divine Blueprint teaching series directory: ${seriesRoot}`);
}
if (!existsSync(chapterRoot)) {
  throw new Error(`Missing Divine Blueprint chapter directory: ${chapterRoot}`);
}

const sourceFiles = (await readdir(seriesRoot))
  .filter((name) => /^chapter-[1-9]-part-[1-5]\.json$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (sourceFiles.length !== 45) {
  throw new Error(`Expected 45 individual chapter-series teachings, found ${sourceFiles.length}.`);
}

const seen = new Set();
const outlines = new Map();
let copied = 0;
let published = 0;

for (const name of sourceFiles) {
  const teaching = JSON.parse(await readFile(join(seriesRoot, name), "utf8"));
  const chapter = Number(teaching.chapter);
  const episodeNumber = Number(teaching.episodeNumber);
  const title = String(teaching.title || "").trim();
  const key = `${chapter}-${episodeNumber}`;

  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 9) {
    throw new Error(`Invalid chapter number in ${name}.`);
  }
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1 || episodeNumber > 5) {
    throw new Error(`Invalid teaching number in ${name}.`);
  }
  if (!title) throw new Error(`Missing teaching title in ${name}.`);
  if (seen.has(key)) throw new Error(`Duplicate chapter teaching: ${key}.`);
  seen.add(key);

  const normalized = {
    ...teaching,
    chapter,
    episodeNumber,
    title,
    status: String(teaching.status || "draft").toLowerCase(),
    seriesTitle: teaching.seriesTitle || `${teaching.chapterTitle || `Chapter ${chapter}`} Teaching Series`
  };

  if (!outlines.has(chapter)) outlines.set(chapter, []);
  outlines.get(chapter)[episodeNumber - 1] = title;

  const outputName = `${generatedPrefix}chapter-${chapter}-part-${episodeNumber}.json`;
  await writeFile(join(teachingRoot, outputName), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  copied += 1;
  if (normalized.status === "published") published += 1;
}

for (let chapter = 1; chapter <= 9; chapter += 1) {
  const titles = outlines.get(chapter) || [];
  if (titles.length !== 5 || titles.some((title) => !title)) {
    throw new Error(`Chapter ${chapter} does not contain exactly five named teachings.`);
  }

  const chapterPath = join(chapterRoot, `chapter-${chapter}.json`);
  const chapterData = JSON.parse(await readFile(chapterPath, "utf8"));
  chapterData.teachingOutline = titles;
  await writeFile(chapterPath, `${JSON.stringify(chapterData, null, 2)}\n`, "utf8");
}

console.log(`Synchronized ${copied} consolidated chapter-series teachings; ${published} currently published. Chapter outlines now derive from the same 45 entries.`);
