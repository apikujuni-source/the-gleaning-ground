import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const settingsPath = resolve("content/page-settings/divine/companion.json");
const page = JSON.parse(await readFile(settingsPath, "utf8"));

function updateCopy(item) {
  if (typeof item.label === "string") {
    item.label = item.label
      .replaceAll("Personal inventories", "Personal reflection")
      .replaceAll("Personal Inventory", "Personal Reflection")
      .replaceAll("Guided Reflection", "Personal Reflection")
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
    if (item.value === "98" && /journal pages/i.test(item.label || "")) item.value = "89";
  }
}

for (const section of page.sections || []) {
  for (const item of section.textFields || []) updateCopy(item);
  for (const item of section.linkFields || []) {
    if (typeof item.label === "string") item.label = item.label.replaceAll("98 pages", "89 pages");
    if (typeof item.text === "string") item.text = item.text.replaceAll("98 pages", "89 pages");
  }
}

const rhythm = (page.sections || []).find((section) =>
  /repeatable rhythm for real formation/i.test(section.label || "")
);
if (!rhythm || !Array.isArray(rhythm.textFields)) {
  throw new Error("Could not find the Companion rhythm settings section.");
}

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

const serialized = JSON.stringify(page, null, 2) + "\n";
if (/Personal Inventory|Guided Reflection|98 pages/.test(serialized)) {
  throw new Error("The Companion page settings still contain retired reflection copy or the old page count.");
}

const personalReflectionHeadings = rhythm.textFields.filter(
  (item) => item.value === "Personal Reflection"
);
if (personalReflectionHeadings.length !== 1) {
  throw new Error(
    `Expected one Personal Reflection card in Companion settings; found ${personalReflectionHeadings.length}.`
  );
}

await writeFile(settingsPath, serialized, "utf8");
console.log("Consolidated the Companion CMS settings into one Personal Reflection card.");
