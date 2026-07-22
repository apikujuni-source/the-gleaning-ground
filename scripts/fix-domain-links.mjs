import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = "_site";
const editableExtensions = new Set([".html", ".css", ".js", ".json", ".xml", ".txt", ".md"]);
const replacements = [
  [/https:\/\/www\.thegleaningground\.com/gi, "https://gleaningground.com"],
  [/https:\/\/thegleaningground\.com/gi, "https://gleaningground.com"],
  [/http:\/\/www\.thegleaningground\.com/gi, "https://gleaningground.com"],
  [/http:\/\/thegleaningground\.com/gi, "https://gleaningground.com"]
];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!editableExtensions.has(extname(entry.name).toLowerCase())) continue;

    const original = await readFile(path, "utf8");
    let updated = original;
    for (const [pattern, replacement] of replacements) {
      updated = updated.replace(pattern, replacement);
    }
    if (updated !== original) await writeFile(path, updated, "utf8");
  }
}

await walk(root);
console.log("Normalized ministry links to https://gleaningground.com");
