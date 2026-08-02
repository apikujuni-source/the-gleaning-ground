import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const sourceParts = [
  "content/imports/devotionals/part-00.b64",
  "content/imports/devotionals/part-01.b64",
  "content/imports/devotionals/part-02a.b64",
  "content/imports/devotionals/part-02b.b64",
  "content/imports/devotionals/part-02c.b64",
  "content/imports/devotionals/part-03.b64",
  "content/imports/devotionals/part-04.b64"
];
const expectedSourceSha256 = "61b79b86398f5128cbe4751171439fd93260cffaf14d0b9bbc3448b36254336e";

const romansSourceParts = [
  "content/imports/devotionals/romans-v2-00.b64",
  "content/imports/devotionals/romans-v2-01.b64",
  "content/imports/devotionals/romans-v2-02.b64",
  "content/imports/devotionals/romans-v2-03.b64",
  "content/imports/devotionals/romans-v2-04.b64",
  "content/imports/devotionals/romans-v2-05.b64",
  "content/imports/devotionals/romans-v2-06.b64",
  "content/imports/devotionals/romans-v2-07.b64"
];
const expectedRomansSha256 = "d837a9070a043e1b3c63d57b14d1af5a21ab37f6e0aa0d0d0ddae9dc83baf541";

const outputDirectory = "content/devotionals";
const legacyImportMarker = "legacyImport: gleaning-ground-old-website-2025";
const romansImportMarker = "romansImport: updated-romans-2026-08";
const dateShiftMarker = "dateShift: one-day-later-2026-08";

for (const sourcePart of sourceParts) {
  if (!existsSync(sourcePart)) {
    throw new Error(`Missing devotional import source part: ${sourcePart}`);
  }
}
for (const sourcePart of romansSourceParts) {
  if (!existsSync(sourcePart)) {
    throw new Error(`Missing updated Romans devotional source part: ${sourcePart}`);
  }
}

function parseCompressedJson(encodedText, expectedSha256, label) {
  const compressed = Buffer.from(encodedText.replace(/\s+/g, ""), "base64");
  const sourceBuffer = gunzipSync(compressed);
  const actualSha256 = createHash("sha256").update(sourceBuffer).digest("hex");

  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `${label} integrity check failed: expected ${expectedSha256}, found ${actualSha256}.`
    );
  }

  return JSON.parse(sourceBuffer.toString("utf8"));
}

const encodedParts = await Promise.all(sourceParts.map((path) => readFile(path, "utf8")));
const legacySource = parseCompressedJson(
  encodedParts.join(""),
  expectedSourceSha256,
  "Legacy devotional source"
);
const romansEncodedParts = await Promise.all(
  romansSourceParts.map((path) => readFile(path, "utf8"))
);
const romansSource = parseCompressedJson(
  romansEncodedParts.join(""),
  expectedRomansSha256,
  "Romans devotional source"
);

const originalLegacyDevotionals = Array.isArray(legacySource.devotionals)
  ? legacySource.devotionals
  : [];
const romansDevotionals = Array.isArray(romansSource.devotionals)
  ? romansSource.devotionals
  : [];

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

function addDays(value, days = 1) {
  const parsed = new Date(`${String(value).trim()}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid devotional date: ${value}`);
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function markdownBody(entry) {
  const body = String(entry.body || "").replace(/\r/g, "").trim();
  const prayer = String(entry.prayer || "").replace(/\r/g, "").trim();
  const sections = [
    `**Scripture Reading:** ${entry.scripture}`,
    "",
    `> ${String(entry.scriptureText || "").replace(/\n+/g, " ").trim()}`,
    "",
    body
  ];

  if (prayer) {
    sections.push("", `**Pray with me:** ${prayer}`);
  }

  return sections.join("\n");
}

function renderDevotional(entry, marker, extraFrontmatter = []) {
  const date = String(entry.date || "").trim();
  const title = String(entry.title || "").trim();
  const scripture = String(entry.scripture || "").trim();
  const scriptureText = String(entry.scriptureText || "").trim();
  const body = String(entry.body || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid or missing date for devotional: ${title || "(untitled)"}`);
  }
  if (!title || !scripture || !scriptureText || !body) {
    throw new Error(`Incomplete devotional dated ${date}.`);
  }

  const titleSlug = slugify(title);
  if (!titleSlug) throw new Error(`Invalid devotional slug: ${title}`);

  const slug = `${date}-${titleSlug}`;
  const permalink = `/devotionals/${slug}/index.html`;
  const description = descriptionFromBody(body, scripture);

  const frontmatter = [
    "---",
    "layout: layouts/post.njk",
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `date: ${date}`,
    "category: Faith",
    `keyScripture: ${yamlString(scriptureText)}`,
    "collectionName: devotionals",
    "collectionLabel: Devotionals",
    `permalink: ${yamlString(permalink)}`,
    marker,
    ...extraFrontmatter,
    "---",
    ""
  ].join("\n");

  return {
    date,
    slug,
    filename: `${slug}.md`,
    content: `${frontmatter}\n${markdownBody(entry)}\n`
  };
}

function shiftManualDevotional(content) {
  if (content.includes(dateShiftMarker)) return content;

  const dateMatch = content.match(/^date:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
  if (!dateMatch) return content;

  const oldDate = dateMatch[1];
  const newDate = addDays(oldDate, 1);
  let shifted = content.replace(
    /^date:\s*\d{4}-\d{2}-\d{2}\s*$/m,
    `date: ${newDate}`
  );

  shifted = shifted.replace(
    /\/devotionals\/\d{4}-\d{2}-\d{2}-/g,
    `/devotionals/${newDate}-`
  );

  shifted = shifted.replace(/^---\s*$/m, `---\n${dateShiftMarker}`);
  return shifted;
}

await mkdir(outputDirectory, { recursive: true });

const romansTitles = new Set(
  romansDevotionals.map((entry) => String(entry.title || "").trim()).filter(Boolean)
);
const originalRomansStartDate = addDays(
  romansSource.dateRange?.start || romansDevotionals[0]?.date,
  -1
);

// Remove generated legacy entries and any older Romans-series files. Shift every
// remaining manually maintained devotional by one day in the build workspace.
for (const name of await readdir(outputDirectory)) {
  if (!name.endsWith(".md")) continue;
  const path = join(outputDirectory, name);
  const content = await readFile(path, "utf8");

  if (
    content.includes(legacyImportMarker) ||
    content.includes(romansImportMarker) ||
    content.includes("series: Romans")
  ) {
    await rm(path, { force: true });
    continue;
  }

  const shifted = shiftManualDevotional(content);
  if (shifted !== content) await writeFile(path, shifted, "utf8");
}

const shiftedLegacyDevotionals = originalLegacyDevotionals
  .filter((entry) => {
    const title = String(entry.title || "").trim();
    const date = String(entry.date || "").trim();
    return !romansTitles.has(title) && date < originalRomansStartDate;
  })
  .map((entry) => ({ ...entry, date: addDays(entry.date, 1) }));

const seenDates = new Set();
const seenSlugs = new Set();

async function writeRendered(rendered) {
  if (seenDates.has(rendered.date)) {
    throw new Error(`Duplicate devotional date: ${rendered.date}`);
  }
  if (seenSlugs.has(rendered.slug)) {
    throw new Error(`Duplicate devotional slug: ${rendered.slug}`);
  }

  seenDates.add(rendered.date);
  seenSlugs.add(rendered.slug);
  await writeFile(join(outputDirectory, rendered.filename), rendered.content, "utf8");
}

for (const entry of shiftedLegacyDevotionals) {
  await writeRendered(renderDevotional(entry, legacyImportMarker));
}

for (const entry of romansDevotionals) {
  await writeRendered(
    renderDevotional(entry, romansImportMarker, ["series: Romans"])
  );
}

if (romansDevotionals.length !== Number(romansSource.count || romansDevotionals.length)) {
  throw new Error(
    `Expected ${romansSource.count} Romans devotionals but generated ${romansDevotionals.length}.`
  );
}

const romansDates = romansDevotionals.map((entry) => entry.date).sort();
if (romansSource.dateRange?.start && romansDates[0] !== romansSource.dateRange.start) {
  throw new Error(
    `First Romans devotional date should be ${romansSource.dateRange.start}, found ${romansDates[0]}.`
  );
}
if (romansSource.dateRange?.end && romansDates.at(-1) !== romansSource.dateRange.end) {
  throw new Error(
    `Last Romans devotional date should be ${romansSource.dateRange.end}, found ${romansDates.at(-1)}.`
  );
}

for (let index = 1; index < romansDates.length; index += 1) {
  const previous = new Date(`${romansDates[index - 1]}T00:00:00Z`);
  const current = new Date(`${romansDates[index]}T00:00:00Z`);
  if (current.getTime() - previous.getTime() !== 86_400_000) {
    throw new Error(
      `Romans devotional dates are not consecutive: ${romansDates[index - 1]} to ${romansDates[index]}.`
    );
  }
}

console.log(
  `Imported ${shiftedLegacyDevotionals.length} shifted legacy devotionals and ` +
    `${romansDevotionals.length} updated Romans devotionals dated ` +
    `${romansDates[0]} through ${romansDates.at(-1)}.`
);
