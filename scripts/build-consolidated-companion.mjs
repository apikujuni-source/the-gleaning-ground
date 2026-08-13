import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/integrate-companion-journal.mjs");
const generatedPath = resolve("scripts/.generated-integrate-companion-journal.mjs");
const downloadsRoot = resolve("_site/divine-blueprint-site/assets/downloads");
const fillablePath = resolve(downloadsRoot, "The-Divine-Blueprint-Companion-Fillable.pdf");
const printPath = resolve(downloadsRoot, "The-Divine-Blueprint-Companion-Print-Ready.pdf");

let source = await readFile(sourcePath, "utf8");

function replaceRequired(pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) {
    throw new Error(`Could not apply Companion consolidation: ${label}. The source generator may have changed.`);
  }
  source = next;
}

replaceRequired(
  /function wrap\(value, max = 70\) \{[\s\S]*?\n\}\nfunction text\(cmd,/,
  `function glyphEm(ch, font = "F1") {
  const times = font === "F3" || font === "F4";
  if (ch === " ") return times ? 0.25 : 0.278;
  if (/[ilI1.,'!:;|]/.test(ch)) return times ? 0.28 : 0.25;
  if (/[mwMW@%]/.test(ch)) return times ? 0.84 : 0.86;
  if (/[fjrt()\\[\\]{}\\-]/.test(ch)) return times ? 0.34 : 0.33;
  if (/[A-Z]/.test(ch)) return times ? 0.68 : 0.66;
  if (/[0-9]/.test(ch)) return times ? 0.50 : 0.556;
  return times ? 0.48 : 0.52;
}
function measureTextWidth(value, size = 10, font = "F1") {
  return [...ascii(value)].reduce((sum, ch) => sum + glyphEm(ch, font) * size, 0);
}
function wrap(value, maxWidth = 360, size = 10, font = "F1") {
  const lines = [];
  for (const paragraphValue of ascii(value).split(/\\n/)) {
    const words = paragraphValue.trim().split(/\\s+/).filter(Boolean);
    let lineValue = "";
    for (const word of words) {
      const candidate = lineValue ? lineValue + " " + word : word;
      if (lineValue && measureTextWidth(candidate, size, font) > maxWidth) {
        lines.push(lineValue);
        lineValue = word;
      } else {
        lineValue = candidate;
      }
    }
    if (lineValue) lines.push(lineValue);
    if (!words.length) lines.push("");
  }
  return lines;
}
function text(cmd,`,
  "width-aware text wrapping"
);

replaceRequired(
  /function paragraph\(cmd, value, x, y, widthChars = 72, size = 10, leading = 14, font = "F1", color = INK, maxLines = 99\) \{[\s\S]*?\n\}/,
  `function paragraph(cmd, value, x, y, widthChars = 72, size = 10, leading = 14, font = "F1", color = INK, maxLines = 99) {
  const inferredWidth = widthChars * size * 0.70;
  let rightEdge = PAGE_W - 52;
  if (x === 68 && font === "F3" && Math.abs(size - 10) < 0.01) rightEdge = 436;
  const maxWidth = Math.max(40, Math.min(inferredWidth, rightEdge - x));
  const lines = wrap(value, maxWidth, size, font).slice(0, maxLines);
  lines.forEach((lineValue, i) => text(cmd, lineValue, x, y - i * leading, size, font, color));
  return y - lines.length * leading;
}`,
  "paragraph wrapping based on available rendered width"
);

replaceRequired(
  `function pageTitle(cmd, kicker, titleValue, pageNo) {
  pageBase(cmd, pageNo);
  text(cmd, kicker.toUpperCase(), 42, 660, 8, "F2", GOLD);
  paragraph(cmd, titleValue, 42, 630, 34, 24, 27, "F4", NAVY, 3);
  line(cmd, 42, 572, PAGE_W - 42, 572, GOLD, 0.8);
}`,
  `function pageTitle(cmd, kicker, titleValue, pageNo) {
  pageBase(cmd, pageNo);
  text(cmd, kicker.toUpperCase(), 42, 660, 8, "F2", GOLD);
  const titleMaxWidth = PAGE_W - 84;
  let titleSize = 24;
  while (titleSize > 20 && measureTextWidth(titleValue, titleSize, "F4") > titleMaxWidth) titleSize -= 0.5;
  if (measureTextWidth(titleValue, titleSize, "F4") <= titleMaxWidth) {
    text(cmd, titleValue, 42, 630, titleSize, "F4", NAVY);
  } else {
    const titleLines = wrap(titleValue, titleMaxWidth, 20, "F4").slice(0, 2);
    titleLines.forEach((lineValue, i) => text(cmd, lineValue, 42, 630 - i * 24, 20, "F4", NAVY));
  }
  line(cmd, 42, 572, PAGE_W - 42, 572, GOLD, 0.8);
}`,
  "section headings fitted to available page width"
);

replaceRequired(
  'const pageNames = ["", "Chapter Objective & Prepare Your Heart", "Formation Pathway & Personal Inventory", "Guided Reflection", "Chapter Synthesis", "Scripture Meditation", "Observe, Understand, Apply", "My Story", "Practice & Declarations", "Kingdom Journal & Spiritual Checkpoint"];',
  'const pageNames = ["", "Chapter Objective & Prepare Your Heart", "Formation Pathway & Personal Reflection", "Unused", "Chapter Synthesis", "Scripture Meditation", "Observe, Understand, Apply", "My Story", "Practice & Declarations", "Kingdom Journal & Spiritual Checkpoint"];',
  "chapter page names"
);

replaceRequired(
  /  } else if \(pageIndex === 2\) \{[\s\S]*?  } else if \(pageIndex === 4\) \{/,
  `  } else if (pageIndex === 2) {
    text(cmd, "THE FORMATION PATHWAY", 48, 530, 10, "F2", NAVY);
    ch.themes.forEach((theme, i) => {
      const x = 50 + i * 80;
      rect(cmd, x, 458, 62, 38, i === 0 ? NAVY : PAPER, GOLD, 0.7);
      text(cmd, theme.toUpperCase(), x + 5, 474, 6.7, "F2", i === 0 ? [1, 1, 1] : NAVY);
      if (i < ch.themes.length - 1) line(cmd, x + 62, 477, x + 78, 477, GOLD, 0.8);
    });
    text(cmd, "PERSONAL REFLECTION", 48, 415, 10, "F2", NAVY);
    text(cmd, "LET THE CHAPTER SEARCH YOUR HEART", 48, 392, 7.8, "F2", GOLD);
    ch.prompts.forEach((p, i) => {
      const y = 338 - i * 82;
      paragraph(cmd, String(i + 1) + ". " + p, 52, y + 28, 65, 9.1, 13, "F2", INK, 2);
      fieldArea(cmd, fields, fillable, prefix + "_reflection_" + String(i + 1), 52, y - 34, 400, 48, true);
    });
  } else if (pageIndex === 4) {`,
  "duplicate Personal Inventory and Guided Reflection pages"
);

replaceRequired(
  'for (const ch of chapters) for (let i = 0; i < 10; i++) specs.push(renderChapterPage(ch, i, fillable, pageNo++));',
  'for (const ch of chapters) for (const i of [0, 1, 2, 4, 5, 6, 7, 8, 9]) specs.push(renderChapterPage(ch, i, fillable, pageNo++));',
  "nine-page chapter sequence"
);

replaceRequired(
  'text(cmd, String(9 + i * 10), 438, y, 8, "F1", MUTED);',
  'text(cmd, String(9 + i * 9), 438, y, 8, "F1", MUTED);',
  "contents page numbers"
);

replaceRequired(
  'paragraph(cmd, "For church, ministry, classroom, or small-group licensing, contact The Gleaning Ground.", 48, 265, 68, 10, 15, "F1");',
  'paragraph(cmd, "For church, ministry, classroom, or small-group licensing, contact The Gleaning Ground at www.gleaningground.com.", 48, 265, 68, 10, 15, "F1");',
  "ministry website in Copyright & Personal-Use License"
);

replaceRequired(
  'paragraph(cmd, ch.prayer, 76, 252, 58, 10, 16, "F3", INK, 5);',
  'paragraph(cmd, ch.prayer, 68, 252, 92, 10, 16, "F3", INK, 2);',
  "full-width Prepare Your Heart prayer text"
);

replaceRequired(
  'paragraph(cmd, ch.summary, 68, 475, 58, 10.5, 17, "F3", NAVY, 7);',
  'paragraph(cmd, ch.summary, 60, 475, 72, 10.5, 17, "F3", NAVY, 3);',
  "full-width Message in One View summary text"
);

source = source
  .replaceAll("A 98-page, 90-day", "An 89-page, 90-day")
  .replaceAll("98 pages in a 7 × 10-inch", "89 pages in a 7 × 10-inch")
  .replaceAll("<strong>98</strong><span>Journal pages</span>", "<strong>89</strong><span>Journal pages</span>")
  .replaceAll("personal inventory, guided reflection", "personal reflection")
  .replaceAll("98 pages each", "89 pages each");

const oldPreviewPair = '<article><span>03</span><h3>Personal Inventory</h3><p>Questions that locate your present condition.</p></article><article><span>04</span><h3>Guided Reflection</h3><p>Space to respond honestly to the chapter.</p></article>';
const newPreviewItem = '<article><span>03</span><h3>Personal Reflection</h3><p>Four focused prompts that locate your present condition and help you respond honestly to the chapter.</p></article>';
replaceRequired(oldPreviewPair, newPreviewItem, "Companion page reflection preview");

for (const [oldNumber, newNumber, heading] of [
  ["05", "04", "Scripture Meditation"],
  ["06", "05", "My Story"],
  ["07", "06", "Practice"],
  ["08", "07", "Declarations"],
  ["09", "08", "Kingdom Journal"],
  ["10", "09", "Spiritual Checkpoint"]
]) {
  replaceRequired(
    `<article><span>${oldNumber}</span><h3>${heading}</h3>`,
    `<article><span>${newNumber}</span><h3>${heading}</h3>`,
    `${heading} preview numbering`
  );
}

if (source.includes("PERSONAL INVENTORY") || source.includes('"Guided Reflection"')) {
  throw new Error("The consolidated Companion generator still contains an old reflection-section heading.");
}

await writeFile(generatedPath, source, "utf8");
try {
  await import(`${pathToFileURL(generatedPath).href}?build=${Date.now()}`);
} finally {
  await rm(generatedPath, { force: true });
}

for (const path of [fillablePath, printPath]) {
  const pdf = (await readFile(path)).toString("latin1");
  if (!pdf.includes("/Count 89")) {
    throw new Error(`${path} does not contain the expected 89 pages.`);
  }
  if (!pdf.includes("www.gleaningground.com")) {
    throw new Error(`${path} does not contain the ministry website on the license page.`);
  }
  if (pdf.includes("PERSONAL INVENTORY") || pdf.includes("Guided Reflection")) {
    throw new Error(`${path} still contains a retired duplicate reflection heading.`);
  }
  const consolidatedHeadings = pdf.match(/PERSONAL REFLECTION/g) || [];
  if (consolidatedHeadings.length !== 9) {
    throw new Error(`${path} contains ${consolidatedHeadings.length} Personal Reflection headings; expected 9.`);
  }
}

console.log("Built and verified an 89-page Companion with width-aware text wrapping in both fillable and print-ready PDFs.");
