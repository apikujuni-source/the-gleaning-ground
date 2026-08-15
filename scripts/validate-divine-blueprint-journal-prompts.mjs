import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const journalSourcePath = "scripts/integrate-companion-journal.mjs";
const chapterRoot = "content/divine-blueprint/chapters";
const siteRoot = "_site/divine-blueprint-site";
const expectedChapterCount = 9;
const expectedPromptsPerChapter = 4;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractJournalPrompts(source, chapter) {
  const chaptersStart = source.indexOf("const chapters = [");
  if (chaptersStart < 0) throw new Error("Could not locate Companion Journal chapter data.");
  const chapterSource = source.slice(chaptersStart);
  const pattern = new RegExp(
    String.raw`\{\s*number:\s*${chapter},[\s\S]*?prompts:\s*(\[[\s\S]*?\])\s*,\s*practices:`,
    "m"
  );
  const match = chapterSource.match(pattern);
  if (!match) throw new Error(`Could not locate Companion Journal prompts for chapter ${chapter}.`);
  const prompts = JSON.parse(match[1]);
  if (
    !Array.isArray(prompts) ||
    prompts.length !== expectedPromptsPerChapter ||
    prompts.some((prompt) => typeof prompt !== "string" || !prompt.trim())
  ) {
    throw new Error(`Invalid Companion Journal prompt set for chapter ${chapter}.`);
  }
  return prompts;
}

function renderedChapterPath(chapter) {
  const candidates = [
    `${siteRoot}/chapter-${chapter}.html`,
    `${siteRoot}/chapter-${chapter}/index.html`
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) throw new Error(`Missing rendered Chapter ${chapter} page.`);
  return path;
}

const journalSource = await readFile(journalSourcePath, "utf8");

for (let chapter = 1; chapter <= expectedChapterCount; chapter += 1) {
  const journalPrompts = extractJournalPrompts(journalSource, chapter);
  const chapterData = JSON.parse(
    await readFile(`${chapterRoot}/chapter-${chapter}.json`, "utf8")
  );

  if (JSON.stringify(chapterData.journalPrompts) !== JSON.stringify(journalPrompts)) {
    throw new Error(`Chapter ${chapter} resource prompts do not match the Companion Journal verbatim.`);
  }

  const html = await readFile(renderedChapterPath(chapter), "utf8");
  for (const prompt of journalPrompts) {
    const expected = `<div class="prompt">${escapeHtml(prompt)}</div>`;
    if (!html.includes(expected)) {
      throw new Error(`Chapter ${chapter} does not render this Companion Journal prompt verbatim: ${prompt}`);
    }
  }
}

console.log(
  `Validated ${expectedChapterCount * expectedPromptsPerChapter} verbatim Journal Prompts across all ${expectedChapterCount} Chapter Resources pages.`
);
