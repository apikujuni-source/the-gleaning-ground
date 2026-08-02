import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const legacyParts = [
  "content/imports/devotionals/part-00.b64",
  "content/imports/devotionals/part-01.b64",
  "content/imports/devotionals/part-02a.b64",
  "content/imports/devotionals/part-02b.b64",
  "content/imports/devotionals/part-02c.b64",
  "content/imports/devotionals/part-03.b64",
  "content/imports/devotionals/part-04.b64"
];
const expectedLegacySha256 = "61b79b86398f5128cbe4751171439fd93260cffaf14d0b9bbc3448b36254336e";

const romansParts = [
  "content/imports/devotionals/romans-plain-00.json",
  "content/imports/devotionals/romans-plain-01.json",
  "content/imports/devotionals/romans-plain-02.json",
  "content/imports/devotionals/romans-plain-03.json"
];
const expectedRomansCount = 28;
const expectedRomansStart = "2025-11-21";
const expectedRomansEnd = "2025-12-18";

const philippiansEphesiansParts = [
  "content/imports/devotionals/philippians-ephesians-00.json",
  "content/imports/devotionals/philippians-ephesians-01.json",
  "content/imports/devotionals/philippians-ephesians-02.json",
  "content/imports/devotionals/philippians-ephesians-03.json",
  "content/imports/devotionals/philippians-ephesians-04.json",
  "content/imports/devotionals/philippians-ephesians-05.json"
];
const expectedPhilippiansEphesiansCount = 33;
const expectedPhilippiansEphesiansStart = "2025-12-19";
const expectedPhilippiansEphesiansEnd = "2026-01-20";

const hebrewsCorinthiansParts = [
  "content/imports/devotionals/hebrews-corinthians-00.json",
  "content/imports/devotionals/hebrews-corinthians-01.json",
  "content/imports/devotionals/hebrews-corinthians-02.json",
  "content/imports/devotionals/hebrews-corinthians-03.json",
  "content/imports/devotionals/hebrews-corinthians-04.json",
  "content/imports/devotionals/hebrews-corinthians-05.json",
  "content/imports/devotionals/hebrews-corinthians-06.json",
  "content/imports/devotionals/hebrews-corinthians-07.json",
  "content/imports/devotionals/hebrews-corinthians-08.json"
];
const expectedHebrewsCorinthiansCount = 69;
const expectedHebrewsCorinthiansStart = "2026-01-21";
const expectedHebrewsCorinthiansEnd = "2026-03-30";

const outputDirectory = "content/devotionals";
const legacyMarker = "legacyImport: gleaning-ground-old-website-2025";
const romansMarker = "romansImport: updated-romans-2026-08";
const philippiansEphesiansMarker = "philippiansEphesiansImport: 2026-08";
const hebrewsCorinthiansMarker = "hebrewsCorinthiansImport: 2026-08";
const dateShiftMarker = "dateShift: one-day-later-2026-08";

for (const part of [
  ...legacyParts,
  ...romansParts,
  ...philippiansEphesiansParts,
  ...hebrewsCorinthiansParts
]) {
  if (!existsSync(part)) throw new Error(`Missing devotional source: ${part}`);
}

const legacyEncoded = (await Promise.all(legacyParts.map((path) => readFile(path, "utf8")))).join("");
const legacyBuffer = gunzipSync(Buffer.from(legacyEncoded.replace(/\s+/g, ""), "base64"));
const actualLegacySha256 = createHash("sha256").update(legacyBuffer).digest("hex");
if (actualLegacySha256 !== expectedLegacySha256) {
  throw new Error(`Legacy devotional source integrity check failed: ${actualLegacySha256}`);
}
const legacySource = JSON.parse(legacyBuffer.toString("utf8"));
const legacyDevotionals = Array.isArray(legacySource.devotionals) ? legacySource.devotionals : [];

async function loadPlainParts(paths) {
  const objects = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, "utf8"))));
  return objects.flatMap((part) => (Array.isArray(part.devotionals) ? part.devotionals : []));
}

const romansDevotionals = await loadPlainParts(romansParts);
const philippiansEphesiansDevotionals = await loadPlainParts(philippiansEphesiansParts);
const hebrewsCorinthiansDevotionals = await loadPlainParts(hebrewsCorinthiansParts);

function addDays(value, days = 1) {
  const parsed = new Date(`${String(value).trim()}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid devotional date: ${value}`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function slugify(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function yamlString(value = "") {
  return `"${String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r", "")
    .replaceAll("\n", " ")}"`;
}

function descriptionFromBody(body = "", scripture = "") {
  const plain = String(body).replace(/\s+/g, " ").trim();
  if (!plain) return `A daily devotional reflection on ${scripture}.`;
  if (plain.length <= 180) return plain;
  const excerpt = plain.slice(0, 177);
  const lastSpace = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, lastSpace > 120 ? lastSpace : 177).trim()}…`;
}

function render(entry, marker, extra = []) {
  const date = String(entry.date || "").trim();
  const title = String(entry.title || "").trim();
  const scripture = String(entry.scripture || "").trim();
  const scriptureText = String(entry.scriptureText || "").trim();
  const body = String(entry.body || "").replace(/\r/g, "").trim();
  const prayer = String(entry.prayer || "").replace(/\r/g, "").trim();
  const specialLabel = String(entry.specialLabel || "").replace(/\r/g, "").trim();
  const afterPrayer = String(entry.afterPrayer || "").replace(/\r/g, "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title || !scripture || !body) {
    throw new Error(`Incomplete devotional: ${title || date || "unknown"}`);
  }

  const titleSlug = slugify(title);
  const slug = `${date}-${titleSlug}`;
  const permalink = `/devotionals/${slug}/index.html`;
  const sections = [];

  if (specialLabel) sections.push(`**${specialLabel}**`, "");
  sections.push(`**Scripture Reading:** ${scripture}`);
  if (scriptureText) sections.push("", `> ${scriptureText.replace(/\n+/g, " ").trim()}`);
  sections.push("", body);
  if (prayer) sections.push("", `**Pray with me:** ${prayer}`);
  if (afterPrayer) sections.push("", `**${afterPrayer}**`);

  const frontmatter = [
    "---",
    "layout: layouts/post.njk",
    `title: ${yamlString(title)}`,
    `description: ${yamlString(descriptionFromBody(body, scripture))}`,
    `date: ${date}`,
    "category: Faith",
    `keyScripture: ${yamlString(scriptureText || scripture)}`,
    "collectionName: devotionals",
    "collectionLabel: Devotionals",
    `permalink: ${yamlString(permalink)}`,
    marker,
    ...extra,
    "---",
    ""
  ].join("\n");

  return { date, slug, filename: `${slug}.md`, content: `${frontmatter}\n${sections.join("\n")}\n` };
}

function shiftManual(content) {
  if (content.includes(dateShiftMarker)) return content;
  const match = content.match(/^date:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
  if (!match) return content;
  const shiftedDate = addDays(match[1], 1);
  let shifted = content.replace(/^date:\s*\d{4}-\d{2}-\d{2}\s*$/m, `date: ${shiftedDate}`);
  shifted = shifted.replace(/\/devotionals\/\d{4}-\d{2}-\d{2}-/g, `/devotionals/${shiftedDate}-`);
  return shifted.replace(/^---\s*$/m, `---\n${dateShiftMarker}`);
}

function validateSeries(entries, expectedCount, expectedStart, expectedEnd, label) {
  if (entries.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label} devotionals, found ${entries.length}.`);
  }

  const dates = entries.map((entry) => entry.date).sort();
  if (dates[0] !== expectedStart || dates.at(-1) !== expectedEnd) {
    throw new Error(`${label} date range is ${dates[0]} to ${dates.at(-1)}.`);
  }

  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(`${dates[index - 1]}T00:00:00Z`);
    const current = new Date(`${dates[index]}T00:00:00Z`);
    if (current - previous !== 86_400_000) {
      throw new Error(`${label} dates are not consecutive: ${dates[index - 1]} to ${dates[index]}.`);
    }
  }
}

validateSeries(romansDevotionals, expectedRomansCount, expectedRomansStart, expectedRomansEnd, "Romans");
validateSeries(
  philippiansEphesiansDevotionals,
  expectedPhilippiansEphesiansCount,
  expectedPhilippiansEphesiansStart,
  expectedPhilippiansEphesiansEnd,
  "Philippians and Ephesians"
);
validateSeries(
  hebrewsCorinthiansDevotionals,
  expectedHebrewsCorinthiansCount,
  expectedHebrewsCorinthiansStart,
  expectedHebrewsCorinthiansEnd,
  "Hebrews and 1 Corinthians"
);

if (addDays(expectedRomansEnd, 1) !== expectedPhilippiansEphesiansStart) {
  throw new Error("The Philippians and Ephesians series must begin the day after Romans ends.");
}
if (addDays(expectedPhilippiansEphesiansEnd, 1) !== expectedHebrewsCorinthiansStart) {
  throw new Error("The Hebrews and 1 Corinthians series must begin the day after Philippians and Ephesians ends.");
}

await mkdir(outputDirectory, { recursive: true });

for (const name of await readdir(outputDirectory)) {
  if (!name.endsWith(".md")) continue;
  const path = join(outputDirectory, name);
  const content = await readFile(path, "utf8");
  if (
    content.includes(legacyMarker) ||
    content.includes(romansMarker) ||
    content.includes(philippiansEphesiansMarker) ||
    content.includes(hebrewsCorinthiansMarker) ||
    content.includes("series: Romans")
  ) {
    await rm(path, { force: true });
    continue;
  }

  const shifted = shiftManual(content);
  if (shifted !== content) await writeFile(path, shifted, "utf8");
}

const romansTitles = new Set(romansDevotionals.map((entry) => String(entry.title || "").trim()));
const originalRomansStart = addDays(expectedRomansStart, -1);
const shiftedLegacy = legacyDevotionals
  .filter(
    (entry) =>
      !romansTitles.has(String(entry.title || "").trim()) &&
      String(entry.date || "") < originalRomansStart
  )
  .map((entry) => ({ ...entry, date: addDays(entry.date, 1) }));

const seenDates = new Set();
const seenSlugs = new Set();
async function writeEntry(rendered) {
  if (seenDates.has(rendered.date)) throw new Error(`Duplicate devotional date: ${rendered.date}`);
  if (seenSlugs.has(rendered.slug)) throw new Error(`Duplicate devotional slug: ${rendered.slug}`);
  seenDates.add(rendered.date);
  seenSlugs.add(rendered.slug);
  await writeFile(join(outputDirectory, rendered.filename), rendered.content, "utf8");
}

for (const entry of shiftedLegacy) await writeEntry(render(entry, legacyMarker));
for (const entry of romansDevotionals) {
  await writeEntry(render(entry, romansMarker, ["series: Romans"]));
}
for (const entry of philippiansEphesiansDevotionals) {
  await writeEntry(
    render(entry, philippiansEphesiansMarker, [
      `series: ${yamlString(entry.series || "Philippians and Ephesians")}`
    ])
  );
}
for (const entry of hebrewsCorinthiansDevotionals) {
  await writeEntry(
    render(entry, hebrewsCorinthiansMarker, [
      `series: ${yamlString(entry.series || "Hebrews and 1 Corinthians")}`
    ])
  );
}

console.log(
  `Imported ${shiftedLegacy.length} shifted legacy devotionals, ` +
    `${romansDevotionals.length} Romans devotionals (${expectedRomansStart} to ${expectedRomansEnd}), ` +
    `${philippiansEphesiansDevotionals.length} Philippians/Ephesians devotionals ` +
    `(${expectedPhilippiansEphesiansStart} to ${expectedPhilippiansEphesiansEnd}), and ` +
    `${hebrewsCorinthiansDevotionals.length} Hebrews/1 Corinthians devotionals ` +
    `(${expectedHebrewsCorinthiansStart} to ${expectedHebrewsCorinthiansEnd}).`
);
