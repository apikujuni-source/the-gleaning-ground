import {
  appendFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";

const mappings = [
  ["content/devotionals", "src/devotionals"],
  ["content/teachings", "src/teachings"],
  ["content/books", "src/books"],
  ["content/resources", "src/resources"],
  ["content/uploads", "src/assets/uploads"]
];

for (const [source, destination] of mappings) {
  if (!existsSync(source)) continue;
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
}

// The Grad Life Blueprint is a separate, non-ministry project and must never
// be included in Gleaning Ground's faith-based books or generated pages.
await rm("src/books/the-grad-life-blueprint.md", { recursive: true, force: true });
await rm("_site/books/the-grad-life-blueprint", { recursive: true, force: true });

if (existsSync("content/site.json")) {
  await mkdir("src/_data", { recursive: true });
  await cp("content/site.json", "src/_data/site.json");
}

if (existsSync("cms/config.yml")) {
  await mkdir("src/admin", { recursive: true });
  await cp("cms/config.yml", "src/admin/config.yml");
}

const textExtensions = new Set([
  ".css", ".html", ".js", ".json", ".md", ".njk", ".svg",
  ".txt", ".xml", ".yaml", ".yml"
]);

const replacements = [
  ["https://www.thegleaningground.com", "https://gleaningground.com"],
  ["https://thegleaningground.com", "https://gleaningground.com"],
  ["www.thegleaningground.com", "gleaningground.com"],
  ["thegleaningground.com", "gleaningground.com"],
  ["hello@thegleaningground.com", "hello@gleaningground.com"],
  ["The Gleaning Ground", "Gleaning Ground"]
];

async function rewriteBranding(directory) {
  if (!existsSync(directory)) return;

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await rewriteBranding(path);
      continue;
    }

    if (!textExtensions.has(extname(entry.name).toLowerCase())) continue;

    const original = await readFile(path, "utf8");
    let updated = original;

    for (const [from, to] of replacements) {
      updated = updated.split(from).join(to);
    }

    if (updated !== original) {
      await writeFile(path, updated, "utf8");
    }
  }
}

await rewriteBranding("src");

const redirectsPath = "src/_redirects";
const requiredRedirects = [
  "/books/the-grad-life-blueprint/*  /books/  301",
  "https://thegleaningground.com/*  https://gleaningground.com/:splat  301!",
  "https://www.thegleaningground.com/*  https://gleaningground.com/:splat  301!",
  "https://www.gleaningground.com/*  https://gleaningground.com/:splat  301!"
];

let redirects = existsSync(redirectsPath)
  ? await readFile(redirectsPath, "utf8")
  : "";

for (const redirect of requiredRedirects) {
  if (redirects.includes(redirect)) continue;
  await appendFile(redirectsPath, `\n${redirect}\n`, "utf8");
  redirects += `\n${redirect}\n`;
}
