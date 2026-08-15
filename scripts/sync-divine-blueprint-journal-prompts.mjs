import { readFile, writeFile } from "node:fs/promises";

const journalSourcePath = "scripts/integrate-companion-journal.mjs";
const chapterRoot = "content/divine-blueprint/chapters";
const expectedChapterCount = 9;
const expectedPromptsPerChapter = 4;

const journalSource = await readFile(journalSourcePath, "utf8");
const chaptersStart = journalSource.indexOf("const chapters = [");
if (chaptersStart < 0) {
  throw new Error(`Could not locate the Companion Journal chapter data in ${journalSourcePath}.`);
}

const journalChapterSource = journalSource.slice(chaptersStart);
const journalPrompts = new Map();

for (let chapter = 1; chapter <= expectedChapterCount; chapter += 1) {
  const pattern = new RegExp(
    String.raw`\{\s*number:\s*${chapter},[\s\S]*?prompts:\s*(\[[\s\S]*?\])\s*,\s*practices:`,
    "m"
  );
  const match = journalChapterSource.match(pattern);
  if (!match) {
    throw new Error(`Could not locate the Companion Journal prompts for chapter ${chapter}.`);
  }

  let prompts;
  try {
    prompts = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Could not parse the Companion Journal prompts for chapter ${chapter}: ${error.message}`);
  }

  if (
    !Array.isArray(prompts) ||
    prompts.length !== expectedPromptsPerChapter ||
    prompts.some((prompt) => typeof prompt !== "string" || !prompt.trim())
  ) {
    throw new Error(
      `Chapter ${chapter} must contain exactly ${expectedPromptsPerChapter} non-empty Companion Journal prompts.`
    );
  }

  journalPrompts.set(chapter, prompts);
}

for (let chapter = 1; chapter <= expectedChapterCount; chapter += 1) {
  const path = `${chapterRoot}/chapter-${chapter}.json`;
  const data = JSON.parse(await readFile(path, "utf8"));

  if (Number(data.chapter) !== chapter) {
    throw new Error(`Expected chapter ${chapter} data in ${path}.`);
  }

  data.journalPrompts = journalPrompts.get(chapter);
  await writeFile(path, `${JSON.stringify(data)}\n`, "utf8");
}

console.log(
  `Synchronized Chapter Resources Journal Prompts verbatim with all ${expectedChapterCount} Companion Journal chapters.`
);
