import { cp, mkdir, rm } from "node:fs/promises";
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

if (existsSync("content/site.json")) {
  await mkdir("src/_data", { recursive: true });
  await cp("content/site.json", "src/_data/site.json");
}

if (existsSync("cms/config.yml")) {
  await mkdir("src/admin", { recursive: true });
  await cp("cms/config.yml", "src/admin/config.yml");
}
