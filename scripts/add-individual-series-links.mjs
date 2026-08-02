import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const teachingRoot = "content/divine-blueprint/teachings";

const chapters = [
  [1, "The Light of Men"],
  [2, "If Children, Then Heirs"],
  [3, "Partakers of His Divine Nature"],
  [4, "But Is Under Tutors"],
  [5, "Becoming Sons"],
  [6, "The Cross in the Making of Sons"],
  [7, "Knowledge in the Making of Sons"],
  [8, "The Fellowship of the Spirit in the Making of Sons"],
  [9, "The Manifestation of the Sons of God"]
];

const styles = `<style id="individual-series-links-styles">
.series-part-links{display:grid;gap:.55rem;margin:1rem 0 1.15rem}
.series-part-link,.series-part-coming{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.65rem;padding:.7rem .8rem;border:1px solid #dfd2b2;border-radius:10px;text-decoration:none}
.series-part-link{background:#fff;color:#173b62;transition:transform .2s ease,border-color .2s ease,background-color .2s ease}
.series-part-link:hover,.series-part-link:focus-visible{transform:translateY(-1px);border-color:#b38742;background:#fff8e8;outline:none}
.series-part-coming{background:#f7f5ef;color:#6f6b61}
.series-part-number{display:inline-flex;align-items:center;justify-content:center;min-width:2.35rem;height:2.35rem;border-radius:999px;background:#173b62;color:#fff;font-weight:800;font-size:.82rem}
.series-part-coming .series-part-number{background:#aaa59b}
.series-part-title{font-weight:700;line-height:1.3}
.series-part-action{font-size:.82rem;font-weight:700;color:#946c28;white-space:nowrap}
.series-navigation{margin:2rem 0;padding:1.25rem;border:1px solid #dfd2b2;border-radius:14px;background:#fbf8f0}
.series-navigation h2{margin-top:0}
@media(max-width:620px){.series-part-link,.series-part-coming{grid-template-columns:auto 1fr}.series-part-action{grid-column:2}}
</style>`;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugFromFile(fileName) {
  return basename(fileName, extname(fileName))
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function teachingHref(teaching) {
  return `/teaching/${teaching._slug}/`;
}

async function readPublishedTeachings() {
  if (!existsSync(teachingRoot)) return [];
  const names = (await readdir(teachingRoot)).filter((name) => name.endsWith(".json"));
  const values = [];
  for (const name of names) {
    const teaching = JSON.parse(await readFile(join(teachingRoot, name), "utf8"));
    if (String(teaching.status || "draft").toLowerCase() !== "published") continue;
    values.push({ ...teaching, _slug: slugFromFile(name) });
  }
  return values;
}

function chapterParts(chapter, teachings) {
  const chapterTeachings = teachings
    .filter((item) => Number(item.chapter) === Number(chapter))
    .sort((a, b) => Number(a.episodeNumber || 999) - Number(b.episodeNumber || 999));

  return Array.from({ length: 5 }, (_, index) => {
    const part = index + 1;
    const teaching = chapterTeachings.find((item) => Number(item.episodeNumber) === part);
    return { part, teaching };
  });
}

function renderParts(chapter, teachings, currentSlug = "") {
  return `<div class="series-part-links">${chapterParts(chapter, teachings).map(({ part, teaching }) => {
    if (!teaching) {
      return `<div class="series-part-coming"><span class="series-part-number">${part}</span><span class="series-part-title">Part ${part}</span><span class="series-part-action">Coming soon</span></div>`;
    }
    const current = teaching._slug === currentSlug ? ' aria-current="page"' : "";
    const action = teaching._slug === currentSlug ? "You are here" : "Open teaching →";
    return `<a class="series-part-link" href="${teachingHref(teaching)}"${current}><span class="series-part-number">${part}</span><span class="series-part-title">${escapeHtml(teaching.title || `Part ${part}`)}</span><span class="series-part-action">${action}</span></a>`;
  }).join("")}</div>`;
}

function addStyles(html) {
  const clean = html.replace(/<style id="individual-series-links-styles">[\s\S]*?<\/style>/g, "");
  return clean.replace("</head>", `${styles}\n</head>`);
}

async function updateTeachingsOverview(path, teachings) {
  if (!existsSync(path)) return false;
  let html = addStyles(await readFile(path, "utf8"));
  html = html.replace(/<!-- individual-series-parts:start -->[\s\S]*?<!-- individual-series-parts:end -->/g, "");

  for (const [chapter, title] of chapters) {
    const titlePattern = escapeRegex(escapeHtml(title));
    const cardPattern = new RegExp(`(<div class="resource-card"><span class="status[^"]*">[\\s\\S]*?<h3>${titlePattern}<\\/h3><p>[\\s\\S]*?<\\/p>)(<a class="btn btn-secondary" href="\\/chapter-${chapter}#teaching-series">)`);
    const links = `<!-- individual-series-parts:start -->${renderParts(chapter, teachings)}<!-- individual-series-parts:end -->`;
    html = html.replace(cardPattern, `$1${links}$2`);
  }

  await writeFile(path, html, "utf8");
  return true;
}

async function updateChapterPage(path, chapter, teachings) {
  if (!existsSync(path)) return false;
  let html = addStyles(await readFile(path, "utf8"));
  html = html.replace(/<!-- chapter-individual-series:start -->[\s\S]*?<!-- chapter-individual-series:end -->/g, "");
  const links = `<!-- chapter-individual-series:start --><div class="series-navigation"><h3>Five-Part Teaching Series</h3><p>Open each teaching separately.</p>${renderParts(chapter, teachings)}</div><!-- chapter-individual-series:end -->`;
  html = html.replace(/(<h2 id="teaching-series">Teaching Series<\/h2>)([\s\S]*?)(<h2 id="journal-prompts">)/, `$1$2${links}$3`);
  await writeFile(path, html, "utf8");
  return true;
}

async function updateTeachingDetail(teaching, teachings) {
  const path = join(siteRoot, "teaching", teaching._slug, "index.html");
  if (!existsSync(path)) return false;
  let html = addStyles(await readFile(path, "utf8"));
  html = html.replace(/<!-- teaching-series-navigation:start -->[\s\S]*?<!-- teaching-series-navigation:end -->/g, "");
  const navigation = `<!-- teaching-series-navigation:start --><section class="series-navigation"><h2>Continue the Five-Part Series</h2><p>Each part has its own page and can be opened separately.</p>${renderParts(teaching.chapter, teachings, teaching._slug)}</section><!-- teaching-series-navigation:end -->`;
  html = html.replace(/(<div class="teaching-actions"><a class="btn btn-secondary" href="\/teachings">)/, `${navigation}$1`);
  await writeFile(path, html, "utf8");
  return true;
}

const teachings = await readPublishedTeachings();
let updated = 0;

for (const path of [join(siteRoot, "teachings.html"), join(siteRoot, "teachings", "index.html")]) {
  if (await updateTeachingsOverview(path, teachings)) updated += 1;
}

for (const [chapter] of chapters) {
  for (const path of [join(siteRoot, `chapter-${chapter}.html`), join(siteRoot, `chapter-${chapter}`, "index.html")]) {
    if (await updateChapterPage(path, chapter, teachings)) updated += 1;
  }
}

for (const teaching of teachings) {
  if (await updateTeachingDetail(teaching, teachings)) updated += 1;
}

console.log(`Added separate Part 1–5 links to ${updated} Divine Blueprint page(s).`);
