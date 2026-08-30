import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const siteRoot = "_site";
const divineRoot = join(siteRoot, "divine-blueprint-site");
const requiredTargets = [
  "bible-studies/index.html",
  "teachings/index.html",
  "podcast/index.html",
  "companion/index.html"
];

for (const target of requiredTargets) {
  if (!existsSync(join(divineRoot, target))) {
    throw new Error(`Missing Divine Blueprint resource target: ${target}`);
  }
}

async function findMainHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "divine-blueprint-site" || entry.name === "admin") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findMainHtml(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

const requiredLinks = [
  "https://divineblueprint.gleaningground.com/bible-studies",
  "https://divineblueprint.gleaningground.com/teachings",
  "https://divineblueprint.gleaningground.com/podcast",
  "https://divineblueprint.gleaningground.com/companion",
  "/teachings/",
  "/resources/"
];

let validated = 0;
for (const path of await findMainHtml(siteRoot)) {
  const html = await readFile(path, "utf8");
  const nav = html.match(/<nav class="main-nav"[\s\S]*?<\/nav>/i)?.[0];
  if (!nav) continue;

  const file = relative(siteRoot, path);
  if ((nav.match(/data-main-resources-menu/g) || []).length !== 1) {
    throw new Error(`${file}: expected one consolidated Resources menu.`);
  }
  if (!nav.includes('class="main-nav-resource-link" href="https://divineblueprint.gleaningground.com/bible-studies"')) {
    throw new Error(`${file}: the primary Resources link does not enter the Divine Blueprint resource area.`);
  }
  for (const href of requiredLinks) {
    if (!nav.includes(`href="${href}"`)) throw new Error(`${file}: missing resource link ${href}`);
  }

  const withoutMenu = nav.replace(/<div class="main-nav-dropdown"[\s\S]*?<\/div>\s*<\/div>/i, "");
  if (/href="\/teachings\/"[^>]*>Teachings<\/a>/i.test(withoutMenu)) {
    throw new Error(`${file}: Teachings remains duplicated as a top-level header item.`);
  }
  if (/href="\/resources\/"[^>]*>Resources<\/a>/i.test(withoutMenu)) {
    throw new Error(`${file}: the old local Resources item remains in the header.`);
  }
  validated += 1;
}

if (validated < 10) throw new Error(`Only ${validated} main-site navigation instances were validated.`);
console.log(`Validated the consolidated Resources menu across ${validated} Gleaning Ground pages and all four Divine Blueprint resource destinations.`);
