import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const config = JSON.parse(await readFile("content/divine-blueprint/purchase.json", "utf8"));
const mode = String(config.mode || "standard").trim().toLowerCase();

if (!['preorder', 'standard'].includes(mode)) {
  throw new Error(`Unsupported Divine Blueprint store mode: ${config.mode}. Use preorder or standard.`);
}

if (mode === "preorder") {
  await import("./apply-divine-blueprint-preorder.mjs");
} else {
  await writeFile(
    join("_site/divine-blueprint-site", "book-preorder-status.txt"),
    [
      "BOOK_PREORDER_FLOW=INACTIVE",
      "MODE=STANDARD",
      `PAPERBACK_US_ACTIVE=${config.paperbackPriceUs || ""}`,
      `KINDLE_ACTIVE=${config.kindleLaunchPrice || ""}`,
      `PAPERBACK_NIGERIA_ACTIVE=${config.paperbackPriceNigeria || ""}`
    ].join("\n") + "\n",
    "utf8"
  );
  console.log("Divine Blueprint storefront is in standard mode; preorder-specific banners and crossed-out pricing were skipped.");
}
