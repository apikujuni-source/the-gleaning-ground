import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const originalHeading = "The Big Idea";
const replacementHeading = "The Central Truth";

let filesUpdated = 0;
let replacementsMade = 0;

async function updateHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await updateHtmlFiles(filePath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    const html = await readFile(filePath, "utf8");
    const occurrences = html.split(originalHeading).length - 1;
    if (occurrences === 0) continue;

    const updatedHtml = html.replaceAll(originalHeading, replacementHeading);
    await writeFile(filePath, updatedHtml, "utf8");

    filesUpdated += 1;
    replacementsMade += occurrences;
  }
}

await updateHtmlFiles(siteRoot);

console.log(
  `Replaced “${originalHeading}” with “${replacementHeading}” ${replacementsMade} time(s) across ${filesUpdated} Divine Blueprint HTML file(s).`
);
