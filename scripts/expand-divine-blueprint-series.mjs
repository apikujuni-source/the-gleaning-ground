import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const seriesRoot = "content/divine-blueprint/teaching-series";
const titleSourcePath = "content/divine-blueprint/teaching-series-titles.json";
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
if (!existsSync(titleSourcePath)) {
  throw new Error(`Missing canonical Divine Blueprint teaching title source: ${titleSourcePath}`);
}
if (!existsSync(chapterRoot)) {
  throw new Error(`Missing Divine Blueprint chapter directory: ${chapterRoot}`);
}

const titleSource = JSON.parse(await readFile(titleSourcePath, "utf8"));
const canonicalTitles = new Map();

for (const chapterEntry of titleSource.chapters || []) {
  const chapter = Number(chapterEntry.chapter);
  const titles = Array.isArray(chapterEntry.titles)
    ? chapterEntry.titles.map((title) => String(title || "").trim())
    : [];

  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 9) {
    throw new Error(`Invalid chapter number in ${titleSourcePath}.`);
  }
  if (titles.length !== 5 || titles.some((title) => !title)) {
    throw new Error(`Chapter ${chapter} must contain exactly five canonical teaching titles.`);
  }

  titles.forEach((title, index) => canonicalTitles.set(`${chapter}-${index + 1}`, title));
}

if (canonicalTitles.size !== 45) {
  throw new Error(`Expected 45 canonical teaching titles, found ${canonicalTitles.size}.`);
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
let retitled = 0;

for (const name of sourceFiles) {
  const sourcePath = join(seriesRoot, name);
  const teaching = JSON.parse(await readFile(sourcePath, "utf8"));
  const chapter = Number(teaching.chapter);
  const episodeNumber = Number(teaching.episodeNumber);
  const key = `${chapter}-${episodeNumber}`;
  const canonicalTitle = canonicalTitles.get(key);

  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 9) {
    throw new Error(`Invalid chapter number in ${name}.`);
  }
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1 || episodeNumber > 5) {
    throw new Error(`Invalid teaching number in ${name}.`);
  }
  if (!canonicalTitle) throw new Error(`Missing canonical teaching title for ${key}.`);
  if (seen.has(key)) throw new Error(`Duplicate chapter teaching: ${key}.`);
  seen.add(key);

  if (String(teaching.title || "").trim() !== canonicalTitle) retitled += 1;

  const normalized = {
    ...teaching,
    chapter,
    episodeNumber,
    title: canonicalTitle,
    status: String(teaching.status || "draft").toLowerCase(),
    seriesTitle: teaching.seriesTitle || `${teaching.chapterTitle || `Chapter ${chapter}`} Teaching Series`
  };

  // Keep every build surface synchronized from the canonical 45-title source.
  await writeFile(sourcePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  if (!outlines.has(chapter)) outlines.set(chapter, []);
  outlines.get(chapter)[episodeNumber - 1] = canonicalTitle;

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

console.log(`Synchronized ${copied} chapter-series teachings from the canonical title list; ${retitled} title entries changed and ${published} teachings are currently published.`);
