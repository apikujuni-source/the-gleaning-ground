import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const settingsPath = "content/site-controls/main-home.json";
const homepagePath = "src/index.njk";

if (!existsSync(settingsPath)) throw new Error(`Missing ${settingsPath}`);
if (!existsSync(homepagePath)) throw new Error(`Missing ${homepagePath}`);

const settings = JSON.parse(await readFile(settingsPath, "utf8"));
const reference = String(settings.heroVerseReference || "").trim();
const verse = String(settings.heroVerseText || "").trim();
if (!reference || !verse) throw new Error("Homepage Scripture reference and text must both be provided in the admin settings.");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const original = await readFile(homepagePath, "utf8");
const pattern = /<div class="hero-verse"><span>[\s\S]*?<\/span>[“\"]?[\s\S]*?[”\"]?<\/div>/i;
if (!pattern.test(original)) throw new Error("Could not locate the homepage hero Scripture block.");

const replacement = `<div class="hero-verse"><span>${escapeHtml(reference)}</span>“${escapeHtml(verse)}”</div>`;
const updated = original.replace(pattern, replacement);
await writeFile(homepagePath, updated, "utf8");
console.log(`Applied admin-managed Gleaning Ground homepage Scripture: ${reference}.`);
