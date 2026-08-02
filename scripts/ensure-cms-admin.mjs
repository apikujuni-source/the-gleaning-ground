import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import YAML from "yaml";

const outputDirectory = "_site/admin";
const sourceConfig = "cms/config.yml";
const editorFragment = "cms/divine-blueprint-editor.yml";
const brandingFragment = "cms/site-branding.yml";
const siteSettingsPath = "content/site.json";
const outputConfig = `${outputDirectory}/config.yml`;
const outputIndex = `${outputDirectory}/index.html`;

for (const requiredPath of [sourceConfig, editorFragment, brandingFragment, siteSettingsPath]) {
  if (!existsSync(requiredPath)) throw new Error(`Missing CMS source file: ${requiredPath}`);
}

await mkdir(outputDirectory, { recursive: true });

let config = await readFile(sourceConfig, "utf8");
const editorContent = (await readFile(editorFragment, "utf8")).trimEnd();
const brandingContent = (await readFile(brandingFragment, "utf8")).trimEnd();
const siteSettings = JSON.parse(await readFile(siteSettingsPath, "utf8"));
const logoPath = String(siteSettings.logo || "/assets/uploads/logo_official.png").trim();
const insertionMarker = "collections:\n";

if (!config.includes(insertionMarker)) {
  throw new Error("Could not locate the CMS collection insertion point.");
}

const fragments = [];
if (!config.includes("name: site_branding")) fragments.push(brandingContent);
if (!config.includes("name: divine_chapter_resources")) fragments.push(editorContent);
if (fragments.length) {
  config = config.replace(insertionMarker, `${insertionMarker}${fragments.join("\n\n")}\n\n`);
}

config = config
  .replace(/^logo_url:.*$/m, `logo_url: https://gleaningground.com${logoPath}`)
  .replace("    label: The Divine Blueprint\n", '    label: "4. Homepage & Book Cover"\n')
  .replace("    label: Divine Blueprint Pages\n", '    label: "Advanced — Divine Blueprint Pages"\n')
  .replace(
    '    description: "Edit the homepage, Start Here, all nine chapters, studies, teachings, podcast, companion, and ministry pages."',
    '    description: "Advanced section-by-section editor. Use Site Logo & Branding, Edit Chapter Resources, Teaching Series, and Additional Teachings for normal updates."'
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

parsedConfig.logo_url = `https://gleaningground.com${logoPath}`;
parsedConfig.load_config_file = false;
const inlineConfig = JSON.stringify(parsedConfig).replaceAll("<", "\\u003c");

await writeFile(outputConfig, config, "utf8");

const chapterSeries = [
  [1, "The Light of Men", ["The Condition Before Creation", "Without Form, Void, and in Darkness", "Why God Created Light First", "Jesus, the Light of Men", "The Spirit and the Word in Recreation"]],
  [2, "If Children, Then Heirs", ["The Spirit of Adoption", "Redemption: Bought Back to God", "Translation into the Kingdom", "The Identity of a Child", "Heirs of God and Joint Heirs with Christ"]],
  [3, "Partakers of His Divine Nature", ["What the Divine Nature Means", "Partakers of His Holiness", "No Condemnation in Christ", "Bold Access to the Father", "The Power at Work in Believers"]],
  [4, "But Is Under Tutors", ["The Heir Who Is Still a Child", "God’s Tutors and Governors", "The Place of Discipline", "Learning Under Spiritual Authority", "Submitting to the Process"]],
  [5, "Becoming Sons", ["Children by Birth, Sons by Maturity", "The Marks of Spiritual Childhood", "The Formation of Character", "Responsibility and Inheritance", "Growing into the Measure of Christ"]],
  [6, "The Cross in the Making of Sons", ["The Cross Beyond Forgiveness", "Dying to Self-Will", "Learning Obedience", "Suffering and Spiritual Formation", "The Life of Christ Revealed in Us"]],
  [7, "Knowledge in the Making of Sons", ["Knowledge That Transforms", "The Spirit of Wisdom and Revelation", "Scripture and Spiritual Formation", "Discernment in a Confused World", "Knowing God, Not Merely Knowing About Him"]],
  [8, "The Fellowship of the Spirit in the Making of Sons", ["The Fellowship of the Holy Spirit", "Learning the Voice of the Spirit", "Prayer, Worship, and Communion", "The Role of Spiritual Community", "Walking in Intimacy and Power"]],
  [9, "The Manifestation of the Sons of God", ["Creation Awaits Manifestation", "Character Before Visibility", "Gifts, Calling, and Stewardship", "Serving the Purposes of God", "Raising Other Sons"]]
];

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
    .admin-help{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(480px,calc(100vw - 36px));max-height:min(82vh,760px);overflow:auto;font:14px/1.5 Arial,sans-serif;color:#102f50;background:#fff;border:1px solid #d6c49b;border-radius:14px;box-shadow:0 12px 36px rgba(8,31,55,.2)}
    .admin-help summary{position:sticky;top:0;z-index:2;cursor:pointer;padding:12px 15px;font-weight:700;background:#102f50;color:white;border-radius:13px;list-style:none}
    .admin-help summary::-webkit-details-marker{display:none}
    .admin-help>div{padding:14px 16px}
    .admin-help ol{margin:.4rem 0 .9rem;padding-left:1.25rem}
    .admin-help li{margin:.35rem 0}
    .admin-help h3{margin:1rem 0 .55rem;font-size:15px}
    .admin-help>a,.admin-help div>a{color:#8a6424;font-weight:700}
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
    <summary>Gleaning Ground quick guide</summary>
    <div>
      <ol>
        <li><strong>Site Logo & Branding</strong> lets you upload the official logo yourself. The uploaded file is used exactly as supplied.</li>
        <li><strong>Edit Chapter Resources</strong> changes the Central Truth, studies, questions, journal prompts, declarations, and prayers.</li>
        <li><strong>Teaching Series</strong> contains the five teachings listed under every chapter. Each teaching is a separate editable entry.</li>
        <li><strong>Additional Teachings</strong> is only for material outside a chapter’s Teaching Series.</li>
      </ol>
      <p><a href="#/collections/site_branding/entries/site">Open Site Logo & Branding →</a></p>
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
console.log(`Built the CMS with ${parsedConfig.collections.length} collections, an editable official-logo setting, and 45 direct Teaching Series links.`);
