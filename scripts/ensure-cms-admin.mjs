import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import YAML from "yaml";

const outputDirectory = "_site/admin";
const sourceConfig = "cms/config.yml";
const editorFragment = "cms/divine-blueprint-editor.yml";
const brandingFragment = "cms/site-branding.yml";
const controlFragment = "cms/site-control-center.yml";
const siteSettingsPath = "content/site.json";
const seriesTitlePath = "content/divine-blueprint/teaching-series-titles.json";
const outputConfig = `${outputDirectory}/config.yml`;
const outputIndex = `${outputDirectory}/index.html`;

for (const requiredPath of [
  sourceConfig,
  editorFragment,
  brandingFragment,
  controlFragment,
  siteSettingsPath,
  seriesTitlePath
]) {
  if (!existsSync(requiredPath)) throw new Error(`Missing CMS source file: ${requiredPath}`);
}

await mkdir(outputDirectory, { recursive: true });

let config = await readFile(sourceConfig, "utf8");
const editorContent = (await readFile(editorFragment, "utf8")).trimEnd();
const brandingContent = (await readFile(brandingFragment, "utf8")).trimEnd();
const controlContent = (await readFile(controlFragment, "utf8")).trimEnd();
const siteSettings = JSON.parse(await readFile(siteSettingsPath, "utf8"));
const seriesTitleMap = JSON.parse(await readFile(seriesTitlePath, "utf8"));
const logoPath = String(siteSettings.logo || "/assets/uploads/logo_official.png").trim();
const insertionMarker = "collections:\n";

if (!config.includes(insertionMarker)) {
  throw new Error("Could not locate the CMS collection insertion point.");
}

const fragments = [];
if (!config.includes("name: site_branding")) fragments.push(brandingContent);
if (!config.includes("name: divine_chapter_resources")) fragments.push(editorContent);
if (!config.includes("name: divine_purchase_settings")) fragments.push(controlContent);
if (fragments.length) {
  config = config.replace(insertionMarker, `${insertionMarker}${fragments.join("\n\n")}\n\n`);
}

config = config
  .replace(/^logo_url:.*$/m, `logo_url: https://gleaningground.com${logoPath}`)
  .replace("    label: The Divine Blueprint\n", '    label: "4. Homepage & Book Cover"\n')
  .replace("    label: Divine Blueprint Pages\n", '    label: "Divine Blueprint Pages — Full Static Page Editor"\n')
  .replace(
    '    description: "Edit the homepage, Start Here, all nine chapters, studies, teachings, podcast, companion, and ministry pages."',
    '    description: "Edit headings, paragraphs, buttons, links, images, form labels, SEO, and other captured content on every static Divine Blueprint page. Generated program pages have their own editor under Generated Sections & Special Pages."'
  )
  .replace(
    '    description: "Edit every static section on gleaningground.com. Devotional, teaching, book, and resource cards remain connected to their dedicated collections."',
    '    description: "Edit headings, paragraphs, buttons, links, images, form labels, SEO, and other captured content on every static gleaningground.com page. Devotional, teaching, book, and resource cards remain connected to their dedicated collections."'
  );

let parsedConfig;
try {
  parsedConfig = YAML.parse(config);
} catch (error) {
  throw new Error(`Invalid generated CMS configuration: ${error.message}`);
}

if (!parsedConfig || typeof parsedConfig !== "object" || !Array.isArray(parsedConfig.collections)) {
  throw new Error("Generated CMS configuration is missing its collections array.");
}

const preferredOrder = [
  "site_branding",
  "divine_chapter_resources",
  "divine_series_teachings",
  "divine_teachings",
  "divine_blueprint",
  "divine_purchase_settings",
  "divine_series_title_map",
  "generated_site_controls",
  "global_areas",
  "main_pages",
  "divine_pages",
  "devotionals",
  "teachings",
  "books",
  "resources",
  "settings",
  "advanced_site_overrides"
];
const order = new Map(preferredOrder.map((name, index) => [name, index]));
parsedConfig.collections = parsedConfig.collections
  .map((collection, index) => ({ collection, index }))
  .sort((a, b) => {
    const aRank = order.has(a.collection.name) ? order.get(a.collection.name) : 1000 + a.index;
    const bRank = order.has(b.collection.name) ? order.get(b.collection.name) : 1000 + b.index;
    return aRank - bRank;
  })
  .map(({ collection }) => collection);

parsedConfig.logo_url = `https://gleaningground.com${logoPath}`;
parsedConfig.load_config_file = false;
const inlineConfig = JSON.stringify(parsedConfig).replaceAll("<", "\\u003c");
await writeFile(outputConfig, YAML.stringify(parsedConfig), "utf8");

if (!Array.isArray(seriesTitleMap.chapters) || seriesTitleMap.chapters.length !== 9) {
  throw new Error("Canonical Teaching Series title map must contain all nine chapters.");
}
const chapterNames = new Map([
  [1, "The Light of Men"],
  [2, "If Children, Then Heirs"],
  [3, "Partakers of His Divine Nature"],
  [4, "But Is Under Tutors"],
  [5, "Becoming Sons"],
  [6, "The Cross in the Making of Sons"],
  [7, "Knowledge in the Making of Sons"],
  [8, "The Fellowship of the Spirit in the Making of Sons"],
  [9, "The Manifestation of the Sons of God"]
]);
const chapterSeries = [...seriesTitleMap.chapters]
  .sort((a, b) => Number(a.chapter) - Number(b.chapter))
  .map(({ chapter, titles }) => {
    if (!chapterNames.has(Number(chapter)) || !Array.isArray(titles) || titles.length !== 5) {
      throw new Error(`Chapter ${chapter} must have exactly five canonical Teaching Series titles.`);
    }
    return [Number(chapter), chapterNames.get(Number(chapter)), titles];
  });

const seriesLinks = chapterSeries.map(([chapter, chapterTitle, titles]) => {
  const links = titles.map((title, index) => {
    const part = index + 1;
    return `<a href="#/collections/divine_series_teachings/entries/chapter-${chapter}-part-${part}"><strong>Teaching ${part}</strong><span>${title}</span><em>Edit separately →</em></a>`;
  }).join("");
  return `<section class="series-chapter"><h4>Chapter ${chapter}: ${chapterTitle}</h4>${links}</section>`;
}).join("");

const adminHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Gleaning Ground Content Manager</title>
  <link rel="icon" href="${logoPath}">
  <style>
    :root{color-scheme:light}
    body{margin:0;background:#f4f1e9}
    .admin-help{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(520px,calc(100vw - 36px));max-height:min(84vh,800px);overflow:auto;font:14px/1.5 Arial,sans-serif;color:#102f50;background:#fff;border:1px solid #d6c49b;border-radius:14px;box-shadow:0 12px 36px rgba(8,31,55,.2)}
    .admin-help summary{position:sticky;top:0;z-index:2;cursor:pointer;padding:12px 15px;font-weight:700;background:#102f50;color:white;border-radius:13px;list-style:none}
    .admin-help summary::-webkit-details-marker{display:none}
    .admin-help>div{padding:14px 16px}
    .admin-help ol{margin:.4rem 0 .9rem;padding-left:1.25rem}
    .admin-help li{margin:.35rem 0}
    .admin-help h3{margin:1rem 0 .55rem;font-size:15px}
    .admin-help>a,.admin-help div>a{color:#8a6424;font-weight:700}
    .admin-help .note{padding:.7rem .8rem;background:#faf7ef;border-left:3px solid #b38742;border-radius:0 8px 8px 0}
    .series-shortcuts{display:grid;gap:.8rem}
    .series-chapter{display:grid;gap:.4rem;padding:.7rem;background:#faf7ef;border:1px solid #e5d6b5;border-radius:12px}
    .series-chapter h4{margin:0 0 .2rem;font-size:13px;color:#173b62}
    .series-chapter a{display:grid;grid-template-columns:auto 1fr;gap:.1rem .55rem;padding:.58rem .65rem;color:#102f50;text-decoration:none;background:white;border:1px solid #eadfc5;border-radius:9px}
    .series-chapter a:hover,.series-chapter a:focus-visible{background:#fff4d8;border-color:#b38742;outline:none}
    .series-chapter strong{grid-row:1 / span 2;color:#8a6424;white-space:nowrap}
    .series-chapter span{font-weight:700}
    .series-chapter em{font-style:normal;font-size:12px;color:#6b5a38}
    .cms-startup-error{max-width:760px;margin:4rem auto;padding:1.25rem 1.4rem;font:16px/1.55 Arial,sans-serif;color:#6b1d1d;background:#fff;border:1px solid #d8a9a9;border-radius:14px}
  </style>
  <script>window.CMS_MANUAL_INIT = true;</script>
</head>
<body>
  <details class="admin-help">
    <summary>Website admin quick guide</summary>
    <div>
      <ol>
        <li><strong>Site Logo & Branding</strong> — site identity, contact details, social links, and official logo.</li>
        <li><strong>Gleaning Ground Pages</strong> — every captured static section on gleaningground.com, including homepage text and Scripture.</li>
        <li><strong>Global Navigation & Footer</strong> — shared navigation/footer text, links, and images.</li>
        <li><strong>Divine Blueprint Pages — Full Static Page Editor</strong> — homepage, Start Here, chapters, Companion, studies, teachings, podcast, and other static pages.</li>
        <li><strong>Edit Chapter Resources</strong> — Central Truth, studies, group questions, Journal Prompts, declarations, and prayers. Journal Prompt changes also flow into the generated Companion Journal.</li>
        <li><strong>Teaching Series / Additional Teachings</strong> — teaching titles, status, media, summaries, notes, and downloads.</li>
        <li><strong>Book Sales, Pricing & Order Links</strong> — preorder/standard mode, all prices, savings, Amazon links, WhatsApp numbers, email, and ISBN.</li>
        <li><strong>Generated Sections & Special Pages</strong> — Ambassador, Church Partner, Give a Copy, their homepage callouts, terms, and confirmation page.</li>
        <li><strong>Advanced — Any Page / Site-Wide Override</strong> — for anything not exposed above, including exact text/HTML, links, images, and page-specific or site-wide CSS.</li>
      </ol>
      <p class="note"><strong>Publishing:</strong> Save changes, then Publish them in the editorial workflow. The website rebuild applies your admin-managed content after generated sections so those edits are not silently overwritten.</p>
      <p><a href="#/collections/site_branding/entries/site">Open Site Logo & Branding →</a></p>
      <p><a href="#/collections/divine_purchase_settings/entries/purchase">Open Book Sales & Pricing →</a></p>
      <h3>Edit a Teaching Series item directly</h3>
      <div class="series-shortcuts">${seriesLinks}</div>
      <p><a href="https://divineblueprint.gleaningground.com/teachings" target="_blank" rel="noopener">Open the public teachings page ↗</a></p>
    </div>
  </details>
  <script src="https://unpkg.com/decap-cms@3.8.4/dist/decap-cms.js"></script>
  <script>
    (() => {
      try {
        const init = window.initCMS || window.CMS?.init;
        if (typeof init !== "function") throw new Error("The Decap CMS application did not finish loading.");
        init({ config: ${inlineConfig} });
      } catch (error) {
        console.error("CMS startup failed", error);
        const message = document.createElement("div");
        message.className = "cms-startup-error";
        message.innerHTML = "<strong>The content manager could not start.</strong><br>" + String(error?.message || error) + "<br><br>Reload the page once. If the problem remains, check the latest Netlify deployment log.";
        document.body.prepend(message);
      }
    })();
  </script>
</body>
</html>
`;

await writeFile(outputIndex, adminHtml, "utf8");
console.log(
  `Built the CMS with ${parsedConfig.collections.length} collections, full static-page editors, generated-page controls, storefront settings, site-wide override capability, and 45 canonical Teaching Series shortcuts.`
);
