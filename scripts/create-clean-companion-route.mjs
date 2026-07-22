import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const sourcePath = join(siteRoot, "companion.html");
const cleanDirectory = join(siteRoot, "companion");
const cleanPath = join(cleanDirectory, "index.html");

let companionHtml = await readFile(sourcePath, "utf8");

// A clean /companion URL is one level below the virtual subdomain root.
// Using an explicit base keeps every stylesheet, script, image and download
// anchored to https://divineblueprint.gleaningground.com/.
if (!companionHtml.includes('<base href="/">')) {
  companionHtml = companionHtml.replace(
    "<head>",
    '<head>\n<base href="/">\n<link rel="canonical" href="https://divineblueprint.gleaningground.com/companion">'
  );
}

await mkdir(cleanDirectory, { recursive: true });
await writeFile(cleanPath, companionHtml, "utf8");

// Make the navigation use the public clean route instead of exposing the
// generated companion.html filename.
async function normalizeCompanionLinks(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await normalizeCompanionLinks(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    let html = await readFile(path, "utf8");
    const updated = html
      .replaceAll('href="companion.html"', 'href="/companion"')
      .replaceAll("href='companion.html'", "href='/companion'")
      .replaceAll('href="./companion.html"', 'href="/companion"')
      .replaceAll("href='./companion.html'", "href='/companion'");
    if (updated !== html) await writeFile(path, updated, "utf8");
  }
}

await normalizeCompanionLinks(siteRoot);
console.log(`Created clean Companion route at ${cleanPath}.`);
