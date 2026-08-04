import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const outputAssetDirectory = join(siteRoot, "assets");
const outputAsset = join(outputAssetDirectory, "companion-download-fix.js");
const scriptTag = '<script src="/assets/companion-download-fix.js"></script>';

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }

  return files;
}

await mkdir(outputAssetDirectory, { recursive: true });
await copyFile("assets/companion-download-fix.js", outputAsset);

const pages = await findHtmlFiles(siteRoot);
let injectedPages = 0;

for (const page of pages) {
  let html = await readFile(page, "utf8");
  if (html.includes(scriptTag)) continue;
  if (!html.includes("</body>")) continue;

  html = html.replace("</body>", `${scriptTag}\n</body>`);
  await writeFile(page, html, "utf8");
  injectedPages += 1;
}

await writeFile(
  join(siteRoot, "companion-fix-status.txt"),
  [
    "COMPANION_DOWNLOAD_FIX=ACTIVE",
    "VERSION=2026-08-04-1",
    "PUBLIC_ROUTE=/companion#download-editions",
    "BEHAVIOR=Get the Companion opens the journal download editions",
    `INJECTED_HTML_PAGES=${injectedPages}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Injected the Companion download fix into ${injectedPages} Divine Blueprint pages.`);
