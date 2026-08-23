import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = "_site/divine-blueprint-site/nigeria-order";
const files = [join(root, "index.html"), join(root, "thanks", "index.html")];

for (const file of files) {
  let html = await readFile(file, "utf8");
  if (!html.includes('href="/companion"')) {
    html = html.replace(
      '<a href="/start-here">Start Here</a>',
      '<a href="/start-here">Start Here</a>\n      <a href="/companion">The Companion</a>'
    );
  }
  if (!html.includes('href="/companion">The Companion</a>')) {
    throw new Error(`${file}: could not install The Companion navigation link.`);
  }
  await writeFile(file, html, "utf8");
}

console.log("Patched Nigeria order pages for canonical Divine Blueprint navigation.");
