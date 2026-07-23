import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = "_site/divine-blueprint-site";
const styleUrl = "/assets/styles.css?v=20260723-cover-final";

async function processDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await processDirectory(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    const html = await readFile(path, "utf8");
    const updated = html.replace(
      /href=(['"])(?:\.\/|\/)?(?:divine-blueprint-site\/)?assets\/styles\.css(?:\?[^'"]*)?\1/gi,
      `href="${styleUrl}"`
    );
    if (updated !== html) await writeFile(path, updated, "utf8");
  }
}

await processDirectory(root);
console.log(`Versioned Divine Blueprint stylesheet references as ${styleUrl}.`);
