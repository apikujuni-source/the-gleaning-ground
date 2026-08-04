import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve("_site/divine-blueprint-site");
const paths = [join(root, "companion.html"), join(root, "companion", "index.html")];

const oldPreviewPair = '<article><span>03</span><h3>Personal Inventory</h3><p>Questions that locate your present condition.</p></article><article><span>04</span><h3>Guided Reflection</h3><p>Space to respond honestly to the chapter.</p></article>';
const newPreviewItem = '<article><span>03</span><h3>Personal Reflection</h3><p>Four focused prompts that locate your present condition and help you respond honestly to the chapter.</p></article>';

function consolidateSettings(page) {
  if (!page || typeof page !== "object") return page;

  for (const section of page.sections || []) {
    for (const item of section.textFields || []) {
      if (typeof item.label === "string") {
        item.label = item.label
          .replaceAll("Personal inventories", "Personal reflection")
          .replaceAll("Personal Inventory", "Personal Reflection")
          .replaceAll("98 pages", "89 pages");
      }
      if (typeof item.value === "string") {
        item.value = item.value
          .replaceAll("Personal inventories", "Personal reflection")
          .replaceAll("personal inventory, guided reflection", "personal reflection")
          .replaceAll("98 pages", "89 pages");
        if (item.value === "Personal Inventory") item.value = "Personal Reflection";
        if (item.value === "Questions that locate your present condition.") {
          item.value = "Four focused prompts that locate your present condition and help you respond honestly to the chapter.";
        }
      }
    }
  }

  const rhythm = (page.sections || []).find((section) =>
    /repeatable rhythm for real formation/i.test(section.label || "")
  );
  if (!rhythm || !Array.isArray(rhythm.textFields)) return page;

  const hasRetiredCard = rhythm.textFields.some(
    (item) => item.value === "Guided Reflection" || item.value === "Space to respond honestly to the chapter."
  );
  if (hasRetiredCard) {
    rhythm.textFields = rhythm.textFields.filter((item) => {
      const oldFourthCard = /\/article\[4\]\/(?:h3|p)$/.test(item.xpath || "");
      const retiredCopy =
        item.value === "Guided Reflection" ||
        item.value === "Space to respond honestly to the chapter.";
      return !(oldFourthCard && retiredCopy);
    });
    for (const item of rhythm.textFields) {
      if (typeof item.xpath !== "string") continue;
      item.xpath = item.xpath.replace(/\/article\[(5|6|7|8|9|10)\]\//, (_match, number) =>
        `/article[${Number(number) - 1}]/`
      );
    }
  }

  return page;
}

function scrubCmsPageData(html) {
  return html.replace(
    /<script\b([^>]*\bid=["']cms-page-data["'][^>]*)>([\s\S]*?)<\/script>/gi,
    (element, attributes, body) => {
      try {
        const page = consolidateSettings(JSON.parse(body));
        return `<script${attributes}>${JSON.stringify(page).replace(/</g, "\\u003c")}</script>`;
      } catch (error) {
        throw new Error(`Could not update the Companion CMS page data: ${error.message}`);
      }
    }
  );
}

function updateVisiblePage(html) {
  html = html
    .replaceAll("<li>Personal inventories</li>", "<li>Personal reflection</li>")
    .replaceAll("personal inventory, guided reflection", "personal reflection")
    .replaceAll("98 pages in a 7 × 10-inch journal format", "89 pages in a 7 × 10-inch journal format")
    .replaceAll("<strong>98</strong><span>Journal pages</span>", "<strong>89</strong><span>Journal pages</span>")
    .replaceAll(oldPreviewPair, newPreviewItem);

  for (const [oldNumber, newNumber, heading] of [
    ["05", "04", "Scripture Meditation"],
    ["06", "05", "My Story"],
    ["07", "06", "Practice"],
    ["08", "07", "Declarations"],
    ["09", "08", "Kingdom Journal"],
    ["10", "09", "Spiritual Checkpoint"]
  ]) {
    html = html.replaceAll(
      `<article><span>${oldNumber}</span><h3>${heading}</h3>`,
      `<article><span>${newNumber}</span><h3>${heading}</h3>`
    );
  }

  return html;
}

for (const path of paths) {
  let html = await readFile(path, "utf8");
  html = scrubCmsPageData(updateVisiblePage(html));

  const visibleHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, " ");
  if (/Personal Inventory|Guided Reflection|98 pages/.test(visibleHtml)) {
    throw new Error(`${path} still exposes a retired reflection section or the old page count.`);
  }

  const preview = visibleHtml.match(/<div class="companion-preview-grid">([\s\S]*?)<\/div>/i);
  if (!preview) throw new Error(`Could not find the Companion chapter-preview grid in ${path}.`);
  const cardCount = (preview[1].match(/<article>/g) || []).length;
  if (cardCount !== 9) {
    throw new Error(`${path} contains ${cardCount} Companion rhythm cards; expected 9.`);
  }

  await writeFile(path, html, "utf8");
}

console.log("Updated and verified the Companion page with one Personal Reflection section and 89 journal pages.");
