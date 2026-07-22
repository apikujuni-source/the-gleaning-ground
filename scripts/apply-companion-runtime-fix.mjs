import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const outputAssetDirectory = join(siteRoot, "assets");
const outputAsset = join(outputAssetDirectory, "companion-download-fix.js");
const scriptTag = '<script src="/assets/companion-download-fix.js"></script>';

await mkdir(outputAssetDirectory, { recursive: true });
await copyFile("assets/companion-download-fix.js", outputAsset);

for (const page of [
  join(siteRoot, "companion.html"),
  join(siteRoot, "companion", "index.html")
]) {
  let html = await readFile(page, "utf8");
  if (!html.includes(scriptTag)) {
    html = html.replace("</body>", `${scriptTag}\n</body>`);
    await writeFile(page, html, "utf8");
  }
}

await writeFile(
  join(siteRoot, "companion-fix-status.txt"),
  [
    "COMPANION_DOWNLOAD_FIX=ACTIVE",
    "VERSION=2026-07-22-3",
    "PUBLIC_ROUTE=/companion",
    "BEHAVIOR=Get the Companion opens fillable and print-ready downloads"
  ].join("\n") + "\n",
  "utf8"
);

console.log("Injected the Companion download runtime fix and deployment fingerprint.");
