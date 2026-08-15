import { readFile, writeFile } from "node:fs/promises";

const journalSourcePath = "scripts/integrate-companion-journal.mjs";
const chapterRoot = "content/divine-blueprint/chapters";
const expectedChapterCount = 9;
const expectedPromptsPerChapter = 4;

let source = await readFile(journalSourcePath, "utf8");
const chaptersStart = source.indexOf("const chapters = [");
if (chaptersStart < 0) {
  throw new Error(`Could not locate Companion Journal chapter data in ${journalSourcePath}.`);
}

for (let chapter = 1; chapter <= expectedChapterCount; chapter += 1) {
  const chapterPath = `${chapterRoot}/chapter-${chapter}.json`;
  const data = JSON.parse(await readFile(chapterPath, "utf8"));
  const prompts = data.journalPrompts;

  if (
    Number(data.chapter) !== chapter ||
    !Array.isArray(prompts) ||
    prompts.length !== expectedPromptsPerChapter ||
    prompts.some((prompt) => typeof prompt !== "string" || !prompt.trim())
  ) {
    throw new Error(
      `${chapterPath} must contain exactly ${expectedPromptsPerChapter} non-empty Journal Prompts for chapter ${chapter}.`
    );
  }

  const before = source.slice(0, chaptersStart);
  const chapterSource = source.slice(chaptersStart);
  const pattern = new RegExp(
    String.raw`(\{\s*number:\s*${chapter},[\s\S]*?prompts:\s*)\[[\s\S]*?\](\s*,\s*practices:)`,
    "m"
  );
  const match = chapterSource.match(pattern);
  if (!match) {
    throw new Error(`Could not locate the Companion Journal prompt block for chapter ${chapter}.`);
  }

  const serialized = JSON.stringify(prompts);
  const updatedChapterSource = chapterSource.replace(pattern, `$1${serialized}$2`);
  source = `${before}${updatedChapterSource}`;
}

await writeFile(journalSourcePath, source, "utf8");
console.log(
  `Applied all ${expectedChapterCount * expectedPromptsPerChapter} admin-managed Chapter Resources Journal Prompts to the Companion Journal build source.`
);
