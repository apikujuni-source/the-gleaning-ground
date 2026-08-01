import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";

const links = [
  ["Expanded teaching", "expanded-teaching"],
  ["Personal Bible study", "personal-bible-study"],
  ["Small-group questions", "small-group-questions"],
  ["Teaching series", "teaching-series"],
  ["Journal prompts", "journal-prompts"]
];

const additionalQuestions = [
  "What misconception, resistance, or immature pattern does this chapter expose?",
  "How would living this truth change your relationships, decisions, or service?",
  "What specific step will you take, and how can the group pray for and support you?"
];

const styles = `<style id="chapter-resource-styles">
html{scroll-behavior:smooth}
#expanded-teaching,#personal-bible-study,#small-group-questions,#teaching-series,#journal-prompts{scroll-margin-top:7rem}
.chapter-resource-guide,.chapter-group-note{margin:1rem 0 1.5rem;padding:1rem 1.1rem;border-left:4px solid #b38742;background:#f7f1e3;border-radius:0 12px 12px 0}
.chapter-resource-guide strong,.chapter-group-note strong{color:#173b62}
.chapter-resource-anchor{display:block;height:0;position:relative;top:-.25rem}
.sidebar .chapter-resource-link{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.52rem .65rem;margin:.12rem -.65rem;border-radius:8px;color:inherit;text-decoration:none;font-weight:600;transition:background-color .2s ease,color .2s ease,transform .2s ease}
.sidebar .chapter-resource-link::after{content:'→';color:#b38742}
.sidebar .chapter-resource-link:hover,.sidebar .chapter-resource-link:focus-visible{background:#f7f1e3;color:#173b62;transform:translateX(2px);outline:none}
.small-group-question-list li{margin-bottom:.7rem}
@media print{.sidebar .chapter-resource-link::after{content:''}}
</style>`;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mutateCmsPageData(html) {
  const pattern = /<script id="cms-page-data" type="application\/json">([\s\S]*?)<\/script>/;
  const match = pattern.exec(html);
  if (!match) return html;

  let page;
  try {
    page = JSON.parse(match[1]);
  } catch {
    return html;
  }

  let resourceSection = null;
  for (const section of page.sections || []) {
    const textFields = section.textFields || [];
    for (const field of textFields) {
      if (field.value === "Bible Study Outline") field.value = "Personal Bible Study";
      if (field.value === "Discuss") field.value = "Small-Group Questions";
      if (field.value === "Journal and Reflection") field.value = "Journal Prompts";
    }

    const before = textFields.length;
    section.textFields = textFields.filter((field) => {
      const xpath = String(field.xpath || "");
      return !/\/aside\/div\[1\]\/ul\/li\[\d+\]$/.test(xpath);
    });
    if (section.textFields.length !== before) resourceSection = section;
  }

  if (resourceSection) {
    const retained = (resourceSection.linkFields || []).filter((field) =>
      !/\/aside\/div\[1\]\/ul\/li\[\d+\]\/a$/.test(String(field.xpath || ""))
    );
    resourceSection.linkFields = [
      ...retained,
      ...links.map(([label, id], index) => ({
        label: `Link — ${label}`,
        xpath: `/html/body/main/section[2]/div/aside/div[1]/ul/li[${index + 1}]/a`,
        textEditable: true,
        text: label,
        url: `#${id}`
      }))
    ];
  }

  const json = JSON.stringify(page).replaceAll("<", "\\u003c");
  return html.replace(pattern, `<script id="cms-page-data" type="application/json">${json}</script>`);
}

function updateChapter(html) {
  let updated = html;

  updated = updated.replace(/<style id="chapter-resource-styles">[\s\S]*?<\/style>/g, "");
  updated = updated.replace(/<!-- chapter-resource-guide:start -->[\s\S]*?<!-- chapter-resource-guide:end -->/g, "");
  updated = updated.replace(/<!-- chapter-group-extra:start -->[\s\S]*?<!-- chapter-group-extra:end -->/g, "");
  updated = updated.replace("</head>", `${styles}\n</head>`);

  updated = updated.replace(
    /<span class="section-kicker"(?: id="expanded-teaching")?>Expanded Teaching<\/span>/,
    '<span class="section-kicker" id="expanded-teaching">Expanded Teaching</span>'
  );

  updated = updated.replace(
    /<h2(?: id="personal-bible-study")?>(?:Bible Study Outline|Personal Bible Study)<\/h2>/,
    '<h2 id="personal-bible-study">Personal Bible Study</h2>'
  );

  const studyGuide = '<!-- chapter-resource-guide:start --><div class="chapter-resource-guide"><strong>How to use this study:</strong> Read each listed passage in context. Observe what it reveals about God and spiritual formation, then write one truth to believe and one response to practice.</div><!-- chapter-resource-guide:end -->';
  updated = updated.replace(/(<h3>Study Objective<\/h3>\s*<p>[\s\S]*?<\/p>)/, `$1${studyGuide}`);

  updated = updated.replace(
    /<h3>(?:Discuss|Small-Group Questions)<\/h3>/,
    '<span class="chapter-resource-anchor" id="small-group-questions"></span><h3>Small-Group Questions</h3>'
  );

  updated = updated.replace(/(<span class="chapter-resource-anchor" id="small-group-questions"><\/span><h3>Small-Group Questions<\/h3>\s*<ol>)([\s\S]*?)(<\/ol>)/, (_match, start, existing, end) => {
    const extras = additionalQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("");
    const note = '<!-- chapter-group-extra:start --><div class="chapter-group-note"><strong>Facilitator note:</strong> Give everyone room to answer from Scripture and personal experience. End by agreeing on one practical response and praying for one another.</div><!-- chapter-group-extra:end -->';
    return `${start.replace('<ol>', '<ol class="small-group-question-list">')}${existing}${extras}${end}${note}`;
  });

  updated = updated.replace(
    /<h2(?: id="teaching-series")?>Teaching Series<\/h2>/,
    '<h2 id="teaching-series">Teaching Series</h2>'
  );

  updated = updated.replace(
    /<h2(?: id="journal-prompts")?>(?:Journal and Reflection|Journal Prompts)<\/h2>/,
    '<h2 id="journal-prompts">Journal Prompts</h2>'
  );

  const resourceLinks = `<ul>${links
    .map(([label, id]) => `<li><a class="chapter-resource-link" href="#${id}">${escapeHtml(label)}</a></li>`)
    .join("")}</ul>`;
  updated = updated.replace(
    /(<div class="side-card"><h3>Chapter Resources<\/h3>)<ul>[\s\S]*?<\/ul>/,
    `$1${resourceLinks}`
  );

  return mutateCmsPageData(updated);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      count += await walk(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    const normalized = path.replaceAll("\\", "/");
    if (!/chapter-[1-9](?:\.html|\/index\.html)$/.test(normalized)) continue;

    const original = await readFile(path, "utf8");
    const updated = updateChapter(original);
    if (updated !== original) {
      await writeFile(path, updated, "utf8");
      count += 1;
    }
  }

  return count;
}

const count = await walk(siteRoot);
console.log(`Built five active resource sections across ${count} Divine Blueprint chapter HTML files.`);
