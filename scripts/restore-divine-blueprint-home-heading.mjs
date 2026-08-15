import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const settingsPath = "content/page-settings/divine/home.json";
const siteRoot = "_site/divine-blueprint-site";
const oldHeading = "God Has a Blueprint for Your Journey";
const newHeading = "God Has a Blueprint for Your Becoming";

if (existsSync(settingsPath)) {
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  let changed = false;

  for (const section of settings.sections || []) {
    for (const field of section.textFields || []) {
      if (field.xpath === "/html/body/main/section[1]/div/div[1]/h1" && field.value !== newHeading) {
        field.value = newHeading;
        changed = true;
      }
    }
  }

  if (changed) {
    await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  }
}

for (const path of [`${siteRoot}/index.html`]) {
  if (!existsSync(path)) continue;
  const original = await readFile(path, "utf8");
  let updated = original.replaceAll(oldHeading, newHeading);

  const cmsPattern = /<script id="cms-page-data" type="application\/json">([\s\S]*?)<\/script>/;
  const cmsMatch = cmsPattern.exec(updated);
  if (cmsMatch) {
    try {
      const page = JSON.parse(cmsMatch[1]);
      let cmsChanged = false;
      for (const section of page.sections || []) {
        for (const field of section.textFields || []) {
          if (field.xpath === "/html/body/main/section[1]/div/div[1]/h1" && field.value !== newHeading) {
            field.value = newHeading;
            cmsChanged = true;
          }
        }
      }
      if (cmsChanged) {
        const json = JSON.stringify(page).replaceAll("<", "\\u003c");
        updated = updated.replace(cmsPattern, `<script id="cms-page-data" type="application/json">${json}</script>`);
      }
    } catch {
      // Static replacement above still protects the rendered heading.
    }
  }

  if (!updated.includes(newHeading)) {
    throw new Error(`Homepage heading was not restored in ${path}.`);
  }
  if (updated.includes(oldHeading)) {
    throw new Error(`Old homepage heading remains in ${path}.`);
  }

  if (updated !== original) {
    await writeFile(path, updated, "utf8");
  }
}

console.log(`Restored the Divine Blueprint homepage heading to “${newHeading}”.`);
