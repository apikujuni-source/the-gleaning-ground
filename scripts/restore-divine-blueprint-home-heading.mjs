import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const homepageSettingsPath = "content/divine-blueprint.json";
const pageSettingsPath = "content/page-settings/divine/home.json";
const siteRoot = "_site/divine-blueprint-site";
const headingXpath = "/html/body/main/section[1]/div/div[1]/h1";

if (!existsSync(homepageSettingsPath)) {
  throw new Error(`Missing admin-managed Divine Blueprint homepage settings: ${homepageSettingsPath}`);
}

const homepageSettings = JSON.parse(await readFile(homepageSettingsPath, "utf8"));
const desiredHeading = String(homepageSettings.homepageHeading || "").trim();
if (!desiredHeading) throw new Error("The Divine Blueprint homepage heading cannot be empty.");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

if (existsSync(pageSettingsPath)) {
  const settings = JSON.parse(await readFile(pageSettingsPath, "utf8"));
  let changed = false;
  for (const section of settings.sections || []) {
    for (const field of section.textFields || []) {
      if (field.xpath === headingXpath && field.value !== desiredHeading) {
        field.value = desiredHeading;
        field.label = `Main heading — ${desiredHeading}`;
        changed = true;
      }
    }
  }
  if (changed) await writeFile(pageSettingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

const path = `${siteRoot}/index.html`;
if (existsSync(path)) {
  const original = await readFile(path, "utf8");
  let updated = original;
  const safeHeading = escapeHtml(desiredHeading);

  const knownHeadings = [
    "God Has a Blueprint for Your Transformation",
    "God Has a Blueprint for Your Formation",
    "God Has a Blueprint for Your Journey",
    "God Has a Blueprint for Your Becoming"
  ];
  for (const heading of knownHeadings) {
    updated = updated.replaceAll(escapeHtml(heading), safeHeading).replaceAll(heading, safeHeading);
  }

  const cmsPattern = /<script id="cms-page-data" type="application\/json">([\s\S]*?)<\/script>/;
  const cmsMatch = cmsPattern.exec(updated);
  if (cmsMatch) {
    try {
      const page = JSON.parse(cmsMatch[1]);
      let cmsChanged = false;
      for (const section of page.sections || []) {
        for (const field of section.textFields || []) {
          if (field.xpath === headingXpath && field.value !== desiredHeading) {
            field.value = desiredHeading;
            field.label = `Main heading — ${desiredHeading}`;
            cmsChanged = true;
          }
        }
      }
      if (cmsChanged) {
        const json = JSON.stringify(page).replaceAll("<", "\\u003c");
        updated = updated.replace(cmsPattern, `<script id="cms-page-data" type="application/json">${json}</script>`);
      }
    } catch {
      // The visible heading replacement still protects the rendered page.
    }
  }

  if (!updated.includes(safeHeading) && !updated.includes(desiredHeading)) {
    throw new Error(`Admin-managed homepage heading was not applied in ${path}.`);
  }
  if (updated !== original) await writeFile(path, updated, "utf8");
}

console.log(`Applied admin-managed Divine Blueprint homepage heading: “${desiredHeading}”.`);
