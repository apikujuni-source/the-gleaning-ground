import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, rm } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const RETIRED_SCROLL_COVER_SHA256 =
  "c9a119467f0b84e072ad689c34f230e7bd9f4fe635691daad151d94f33954b9c";
const siteRoot = resolve("_site");
const sourceUploadRoot = resolve("content/uploads");
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".svg",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);

async function filesBelow(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function publicUrls(path) {
  const rootRelative = relative(siteRoot, path).replaceAll("\\", "/");
  const urls = [`/${rootRelative}`];
  if (rootRelative.startsWith("divine-blueprint-site/")) {
    urls.push(`/${rootRelative.replace(/^divine-blueprint-site\//, "")}`);
  }
  return urls;
}

const sourceFiles = await filesBelow(sourceUploadRoot);
for (const path of sourceFiles) {
  const bytes = await readFile(path);
  if (sha256(bytes) === RETIRED_SCROLL_COVER_SHA256) {
    throw new Error(
      `The retired scroll cover still exists in source uploads: ${relative(process.cwd(), path)}`
    );
  }
}

const publicFiles = await filesBelow(siteRoot);
const removedFiles = [];
for (const path of publicFiles) {
  const bytes = await readFile(path);
  if (sha256(bytes) !== RETIRED_SCROLL_COVER_SHA256) continue;
  removedFiles.push(path);
  await rm(path);
}
const removedUrls = [...new Set(removedFiles.flatMap(publicUrls))];

const remainingTextFiles = (await filesBelow(siteRoot)).filter((path) =>
  textExtensions.has(extname(path).toLowerCase())
);
const forbiddenReferences = [];

for (const path of remainingTextFiles) {
  const text = await readFile(path, "utf8");

  for (const url of removedUrls) {
    if (text.includes(url) || text.includes(url.replace(/^\//, ""))) {
      forbiddenReferences.push(`${relative(process.cwd(), path)} references ${url}`);
    }
  }

  for (const match of text.matchAll(
    /data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)/gi
  )) {
    try {
      const bytes = Buffer.from(match[1].replace(/\s+/g, ""), "base64");
      if (sha256(bytes) === RETIRED_SCROLL_COVER_SHA256) {
        forbiddenReferences.push(
          `${relative(process.cwd(), path)} contains the retired scroll cover as embedded data`
        );
      }
    } catch {
      // Other build validation handles malformed data URIs.
    }
  }
}

if (forbiddenReferences.length) {
  throw new Error(
    `References to the retired scroll cover remain:\n${forbiddenReferences.join("\n")}`
  );
}

console.log(
  removedFiles.length
    ? `Deleted the retired scroll cover from ${removedFiles.length} generated location(s) and verified that no links remain.`
    : `Verified that the retired scroll cover and all links to it are absent from ${publicFiles.length} generated files.`
);
