import { appendFile, cp, mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

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
// be included in The Gleaning Ground's faith-based books or generated pages.
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

const redirectsPath = "src/_redirects";
const gradLifeRedirect = "/books/the-grad-life-blueprint/*  /books/  301";
const redirects = existsSync(redirectsPath)
  ? await readFile(redirectsPath, "utf8")
  : "";

if (!redirects.includes(gradLifeRedirect)) {
  await appendFile(redirectsPath, `\n${gradLifeRedirect}\n`, "utf8");
}
