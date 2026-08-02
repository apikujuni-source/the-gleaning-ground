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
const outputDirectory = "content/devotionals";
const importMarker = "legacyImport: gleaning-ground-old-website-2025";
const dateShiftMarker = "dateShift: one-day-later-2026-08";

for (const sourcePart of sourceParts) {
  if (!existsSync(sourcePart)) {
    throw new Error(`Missing devotional import source part: ${sourcePart}`);
  }
}

const encodedParts = await Promise.all(sourceParts.map((path) => readFile(path, "utf8")));
const compressed = Buffer.from(encodedParts.join("").replace(/\s+/g, ""), "base64");
const sourceBuffer = gunzipSync(compressed);
const actualSha256 = createHash("sha256").update(sourceBuffer).digest("hex");

if (actualSha256 !== expectedSourceSha256) {
  throw new Error(
    `Devotional source integrity check failed: expected ${expectedSourceSha256}, found ${actualSha256}.`
  );
}

const source = JSON.parse(sourceBuffer.toString("utf8"));
const originalDevotionals = Array.isArray(source.devotionals) ? source.devotionals : [];

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
  return [
    `**Scripture Reading:** ${entry.scripture}`,
    "",
    `> ${String(entry.scriptureText || "").replace(/\n+/g, " ").trim()}`,
    "",
    body
  ].join("\n");
}

function renderLegacyDevotional(entry) {
  const date = addDays(entry.date, 1);
  const title = String(entry.title || "").trim();
  const scripture = String(entry.scripture || "").trim();
  const scriptureText = String(entry.scriptureText || "").trim();
  const body = String(entry.body || "").trim();

  if (!title || !scripture || !scriptureText || !body) {
    throw new Error(`Incomplete devotional dated ${date}.`);
  }

  const titleSlug = slugify(title);
  if (!titleSlug) throw new Error(`Invalid devotional slug: ${title}`);

  const slug = `${date}-${titleSlug}`;
  const permalink = `/devotionals/${slug}/index.html`;
  const description = descriptionFromBody(body, scripture);
  const content = `---
layout: layouts/post.njk
title: ${yamlString(title)}
description: ${yamlString(description)}
date: ${date}
category: Faith
keyScripture: ${yamlString(scriptureText)}
collectionName: devotionals
collectionLabel: Devotionals
permalink: ${yamlString(permalink)}
${importMarker}
${dateShiftMarker}
---

${markdownBody({ scripture, scriptureText, body })}
`;

  return { date, slug, filename: `${slug}.md`, content };
}

function shiftManualDevotional(content) {
  if (content.includes(dateShiftMarker)) return content;

  const dateMatch = content.match(/^date:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
  if (!dateMatch) return content;

  const newDate = addDays(dateMatch[1], 1);
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

function devotionalDate(content) {
  return content.match(/^date:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1] || "";
}

await mkdir(outputDirectory, { recursive: true });

const seenDates = new Set();
const seenSlugs = new Set();

// Remove previously generated legacy entries. Shift every manually maintained
// devotional one day later in the build workspace.
for (const name of await readdir(outputDirectory)) {
  if (!name.endsWith(".md")) continue;

  const path = join(outputDirectory, name);
  const content = await readFile(path, "utf8");

  if (content.includes(importMarker)) {
    await rm(path, { force: true });
    continue;
  }

  const shifted = shiftManualDevotional(content);
  if (shifted !== content) await writeFile(path, shifted, "utf8");

  const date = devotionalDate(shifted);
  if (date) {
    if (seenDates.has(date)) throw new Error(`Duplicate devotional date: ${date}`);
    seenDates.add(date);
  }
}

for (const entry of originalDevotionals) {
  const rendered = renderLegacyDevotional(entry);

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

const shiftedDates = originalDevotionals.map((entry) => addDays(entry.date, 1)).sort();
const expectedCount = Number(source.count || shiftedDates.length);

if (shiftedDates.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} imported devotionals but generated ${shiftedDates.length}.`);
}

if (source.dateRange?.start && shiftedDates[0] !== addDays(source.dateRange.start, 1)) {
  throw new Error(
    `First imported devotional should be ${addDays(source.dateRange.start, 1)}, found ${shiftedDates[0]}.`
  );
}

if (source.dateRange?.end && shiftedDates.at(-1) !== addDays(source.dateRange.end, 1)) {
  throw new Error(
    `Last imported devotional should be ${addDays(source.dateRange.end, 1)}, found ${shiftedDates.at(-1)}.`
  );
}

console.log(
  `Imported ${shiftedDates.length} legacy devotionals one day later and shifted all manual devotional dates.`
);
