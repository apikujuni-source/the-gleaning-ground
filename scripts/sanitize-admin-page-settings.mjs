import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { isAdminOnlyText } from "./admin-note-policy.mjs";

const settingsRoot = resolve("content/page-settings");
const REMOVE = Symbol("remove-admin-note");

async function listJson(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listJson(path)));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
  return files;
}

function looksLikeContentField(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return ["value", "text", "title", "description", "message", "copy"].some(
    (key) => typeof value[key] === "string" && isAdminOnlyText(value[key])
  );
}

function scrub(value, stats) {
  if (typeof value === "string") {
    if (!isAdminOnlyText(value)) return value;
    stats.stringsRemoved += 1;
    return "";
  }

  if (Array.isArray(value)) {
    const cleaned = [];
    for (const item of value) {
      if (looksLikeContentField(item)) {
        stats.fieldsRemoved += 1;
        continue;
      }
      const next = scrub(item, stats);
      if (next !== REMOVE) cleaned.push(next);
    }
    return cleaned;
  }

  if (value && typeof value === "object") {
    if (looksLikeContentField(value)) return REMOVE;
    const cleaned = {};
    for (const [key, child] of Object.entries(value)) {
      const next = scrub(child, stats);
      if (next !== REMOVE) cleaned[key] = next;
    }
    return cleaned;
  }

  return value;
}

if (!existsSync(settingsRoot)) {
  console.log("No content/page-settings directory found; no admin page notes to sanitize.");
  process.exit(0);
}

let filesChanged = 0;
let fieldsRemoved = 0;
let stringsRemoved = 0;

for (const path of await listJson(settingsRoot)) {
  const original = await readFile(path, "utf8");
  const parsed = JSON.parse(original);
  const stats = { fieldsRemoved: 0, stringsRemoved: 0 };
  const cleaned = scrub(parsed, stats);
  const output = `${JSON.stringify(cleaned, null, 2)}\n`;
  if (output === original) continue;
  await writeFile(path, output, "utf8");
  filesChanged += 1;
  fieldsRemoved += stats.fieldsRemoved;
  stringsRemoved += stats.stringsRemoved;
  console.log(
    `Sanitized ${stats.fieldsRemoved} admin field(s) and ${stats.stringsRemoved} admin string(s) in ${relative(process.cwd(), path)}.`
  );
}

console.log(
  `Sanitized admin-only page settings in ${filesChanged} file(s): ${fieldsRemoved} field(s), ${stringsRemoved} string(s).`
);
