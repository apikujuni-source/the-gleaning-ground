import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const chapterRoot = "content/divine-blueprint/chapters";
const teachingRoot = "content/divine-blueprint/teachings";
const publicOrigin = "https://divineblueprint.gleaningground.com";

const chapterResourceStyles = `<style id="divine-admin-content-styles">
html{scroll-behavior:smooth}
#expanded-teaching,#personal-bible-study,#small-group-questions,#teaching-series,#journal-prompts{scroll-margin-top:7rem}
.chapter-resource-guide,.chapter-group-note,.teaching-empty{margin:1rem 0 1.5rem;padding:1rem 1.1rem;border-left:4px solid #b38742;background:#f7f1e3;border-radius:0 12px 12px 0}
.chapter-resource-guide strong,.chapter-group-note strong,.teaching-empty strong{color:#173b62}
.sidebar .chapter-resource-link{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.52rem .65rem;margin:.12rem -.65rem;border-radius:8px;color:inherit;text-decoration:none;font-weight:600;transition:background-color .2s ease,color .2s ease,transform .2s ease}
.sidebar .chapter-resource-link::after{content:'→';color:#b38742}
.sidebar .chapter-resource-link:hover,.sidebar .chapter-resource-link:focus-visible{background:#f7f1e3;color:#173b62;transform:translateX(2px);outline:none}
.small-group-question-list li,.application-question-list li{margin-bottom:.7rem}
.expanded-teaching-body{margin:1.25rem 0 1.5rem}
.teaching-card-image{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;margin-bottom:1rem}
.teaching-card-meta{display:flex;flex-wrap:wrap;gap:.5rem;margin:.75rem 0}
.teaching-card-meta span{font-size:.82rem;padding:.28rem .55rem;border-radius:999px;background:#eef2f5;color:#173b62}
.teaching-actions{display:flex;flex-wrap:wrap;gap:.7rem;margin-top:1rem}
.teaching-detail-media{margin:1.5rem 0}
.teaching-detail-media iframe,.teaching-detail-media video{width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#071c31}
.teaching-detail-media audio{width:100%}
.teaching-body{margin-top:2rem}
@media print{.sidebar .chapter-resource-link::after{content:''}.teaching-actions{display:none}}
</style>`;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value = "") {
  const url = String(value).trim();
  if (!url) return "";
  if (url.startsWith("/")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return "";
}

function renderInline(value = "") {
  let text = escapeHtml(value);
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_m, label, href) => `<a href="${escapeHtml(href)}">${label}</a>`);
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return text;
}

function renderMarkdown(value = "") {
  const lines = String(value).replace(/\r/g, "").split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${renderInline(paragraph.join(" ").trim())}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const type = unordered ? "ul" : "ol";
      if (listType !== type) {
        closeList();
        listType = type;
        output.push(`<${type}>`);
      }
      output.push(`<li>${renderInline((unordered || ordered)[1])}</li>`);
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${renderInline(line.slice(2))}</blockquote>`);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  return output.join("\n");
}

function list(items, className = "") {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  const attr = className ? ` class="${className}"` : "";
  return `<ol${attr}>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function pills(items) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  return `<div class="pill-list">${values.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function slugFromFile(fileName) {
  return basename(fileName, extname(fileName)).replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

async function readJsonFiles(directory) {
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const values = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const value = JSON.parse(await readFile(join(directory, entry.name), "utf8"));
    values.push({ ...value, _fileName: entry.name, _slug: slugFromFile(entry.name) });
  }
  return values;
}

function dateValue(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function displayDate(value) {
  const timestamp = dateValue(value);
  if (!timestamp) return "";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(timestamp));
}

function teachingHref(teaching) {
  return `/teaching/${teaching._slug}/`;
}

function teachingCard(teaching) {
  const image = safeUrl(teaching.thumbnail);
  const date = displayDate(teaching.publishDate);
  const format = teaching.format || "Teaching";
  return `<article class="resource-card teaching-card">${image ? `<img class="teaching-card-image" src="${escapeHtml(image)}" alt="${escapeHtml(teaching.thumbnailAlt || teaching.title || "Teaching image")}">` : ""}<span class="status">${escapeHtml(teaching.status === "published" ? "Published" : teaching.status || "Teaching")}</span><h3>${escapeHtml(teaching.title || "Untitled Teaching")}</h3><p>${escapeHtml(teaching.summary || "")}</p><div class="teaching-card-meta"><span>Chapter ${escapeHtml(teaching.chapter || "")}</span><span>${escapeHtml(format)}</span>${date ? `<span>${escapeHtml(date)}</span>` : ""}${teaching.duration ? `<span>${escapeHtml(teaching.duration)}</span>` : ""}</div><a class="btn btn-secondary" href="${teachingHref(teaching)}">Open teaching →</a></article>`;
}

function mediaBlock(teaching) {
  const videoUrl = safeUrl(teaching.videoUrl);
  const audioUrl = safeUrl(teaching.audioUrl);
  const mediaFile = safeUrl(teaching.mediaFile);
  const externalUrl = safeUrl(teaching.externalUrl);
  const downloadFile = safeUrl(teaching.downloadFile);
  const actions = [];
  let media = "";

  const youtube = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  const vimeo = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (youtube) {
    media = `<div class="teaching-detail-media"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(youtube[1])}" title="${escapeHtml(teaching.title || "Video teaching")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  } else if (vimeo) {
    media = `<div class="teaching-detail-media"><iframe src="https://player.vimeo.com/video/${escapeHtml(vimeo[1])}" title="${escapeHtml(teaching.title || "Video teaching")}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  } else if (videoUrl) {
    actions.push(`<a class="btn btn-primary" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener">Watch teaching ↗</a>`);
  }

  const mediaExtension = extname((mediaFile || "").split("?")[0]).toLowerCase();
  if (!media && mediaFile && [".mp4", ".webm", ".mov"].includes(mediaExtension)) {
    media = `<div class="teaching-detail-media"><video controls preload="metadata" src="${escapeHtml(mediaFile)}"></video></div>`;
  } else if (mediaFile && [".mp3", ".m4a", ".wav", ".ogg"].includes(mediaExtension)) {
    media += `<div class="teaching-detail-media"><audio controls preload="metadata" src="${escapeHtml(mediaFile)}"></audio></div>`;
  } else if (mediaFile) {
    actions.push(`<a class="btn btn-secondary" href="${escapeHtml(mediaFile)}">Open uploaded teaching</a>`);
  }
  if (audioUrl) media += `<div class="teaching-detail-media"><audio controls preload="metadata" src="${escapeHtml(audioUrl)}"></audio></div>`;
  if (externalUrl) actions.push(`<a class="btn btn-primary" href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener">Open teaching ↗</a>`);
  if (downloadFile) actions.push(`<a class="btn btn-secondary" href="${escapeHtml(downloadFile)}" download>Download resource</a>`);

  return `${media}${actions.length ? `<div class="teaching-actions">${actions.join("")}</div>` : ""}`;
}

function addStyles(html) {
  const cleaned = html.replace(/<style id="divine-admin-content-styles">[\s\S]*?<\/style>/g, "");
  return cleaned.replace("</head>", `${chapterResourceStyles}\n</head>`);
}

function stripCmsMainOverrides(html, sectionNumber = null) {
  const pattern = /<script id="cms-page-data" type="application\/json">([\s\S]*?)<\/script>/;
  const match = pattern.exec(html);
  if (!match) return html;
  try {
    const page = JSON.parse(match[1]);
    const prefix = sectionNumber ? `/html/body/main/section[${sectionNumber}]` : "/html/body/main/";
    for (const section of page.sections || []) {
      for (const fieldName of ["textFields", "linkFields", "imageFields", "attributeFields"]) {
        section[fieldName] = (section[fieldName] || []).filter((field) => !String(field.xpath || "").startsWith(prefix));
      }
    }
    if (!sectionNumber) delete page.seo;
    const json = JSON.stringify(page).replaceAll("<", "\\u003c");
    return html.replace(pattern, `<script id="cms-page-data" type="application/json">${json}</script>`);
  } catch {
    return html;
  }
}

function episodeList(chapter, teachings) {
  const chapterTeachings = teachings
    .filter((item) => Number(item.chapter) === Number(chapter.chapter))
    .sort((a, b) => Number(a.episodeNumber || 999) - Number(b.episodeNumber || 999) || dateValue(a.publishDate) - dateValue(b.publishDate));
  if (chapterTeachings.length) {
    return `<div class="episode-list">${chapterTeachings.map((item, index) => `<div class="episode"><span class="episode-num">${escapeHtml(item.episodeNumber || index + 1)}</span><div><strong>${escapeHtml(item.title || "Teaching")}</strong><br><span class="status">${escapeHtml(item.format || "Teaching")} available</span><br><a class="card-link" href="${teachingHref(item)}">Open teaching →</a></div></div>`).join("")}</div>`;
  }
  const outline = Array.isArray(chapter.teachingOutline) ? chapter.teachingOutline : [];
  return `<div class="episode-list">${outline.map((title, index) => `<div class="episode"><span class="episode-num">${index + 1}</span><div><strong>${escapeHtml(title)}</strong><br><span class="status soon">Teaching coming soon</span></div></div>`).join("")}</div>`;
}

function chapterArticle(chapter, teachings) {
  const study = chapter.personalBibleStudy || {};
  const expanded = String(chapter.expandedTeaching || "").trim();
  const previous = Number(chapter.chapter) === 1 ? "/start-here" : `/chapter-${Number(chapter.chapter) - 1}`;
  const next = Number(chapter.chapter) === 9 ? "/journey" : `/chapter-${Number(chapter.chapter) + 1}`;
  const nextLabel = Number(chapter.chapter) === 9 ? "Return to Journey →" : "Next →";
  return `<article class="prose">
<span class="section-kicker" id="expanded-teaching">Expanded Teaching</span>
<h2>The Central Truth</h2>
<p>${escapeHtml(chapter.centralTruth || chapter.introduction || "")}</p>
${expanded ? `<div class="expanded-teaching-body">${renderMarkdown(expanded)}</div>` : ""}
<blockquote>${escapeHtml(chapter.declaration || "")}</blockquote>
<h2 id="personal-bible-study">Personal Bible Study</h2>
<h3>Study Objective</h3>
<p>${escapeHtml(study.objective || "")}</p>
<div class="chapter-resource-guide"><strong>How to use this study:</strong> Read each listed passage in context. Observe what it reveals about God and spiritual formation, then write one truth to believe and one response to practice.</div>
<h3>Key Scriptures</h3>${pills(study.keyScriptures)}
<h3>Observe</h3>${list(study.observeQuestions)}
<h3>Personal Application</h3>${list(study.applicationQuestions, "application-question-list")}
<h3 id="small-group-questions">Small-Group Questions</h3>${list(chapter.smallGroupQuestions, "small-group-question-list")}
<div class="chapter-group-note"><strong>Facilitator note:</strong> ${escapeHtml(chapter.facilitatorNote || "Give everyone room to answer and pray for one another.")}</div>
<h2 id="teaching-series">Teaching Series</h2>${episodeList(chapter, teachings)}
<h2 id="journal-prompts">Journal Prompts</h2><div class="journal-prompts">${(chapter.journalPrompts || []).map((prompt) => `<div class="prompt">${escapeHtml(prompt)}</div>`).join("")}</div>
<h2>Prayer</h2><p>${escapeHtml(chapter.prayer || "")}</p>
<div class="chapter-complete"><input id="chapter-complete" type="checkbox" data-key="chapter-${escapeHtml(chapter.chapter)}-complete"><label for="chapter-complete">Mark Chapter ${escapeHtml(chapter.chapter)} complete</label></div>
<div style="display:flex;justify-content:space-between;gap:1rem;margin-top:2rem"><a class="btn btn-secondary" href="${previous}">← Previous</a><a class="btn btn-primary" href="${next}">${nextLabel}</a></div>
</article>`;
}

function chapterSidebar(chapter) {
  const resources = [
    ["Expanded teaching", "expanded-teaching"],
    ["Personal Bible study", "personal-bible-study"],
    ["Small-group questions", "small-group-questions"],
    ["Teaching series", "teaching-series"],
    ["Journal prompts", "journal-prompts"]
  ];
  return `<aside class="sidebar"><div class="side-card"><h3>Chapter Resources</h3><ul>${resources.map(([label, id]) => `<li><a class="chapter-resource-link" href="#${id}">${label}</a></li>`).join("")}</ul><button class="btn btn-secondary" type="button" data-print>Print this study</button></div><div class="side-card"><h3>Memory Declaration</h3><p>${escapeHtml(chapter.declaration || "")}</p></div></aside>`;
}

async function updateChapterPage(chapter, teachings, path) {
  if (!existsSync(path)) return false;
  let html = await readFile(path, "utf8");
  html = addStyles(html);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(chapter.introduction || "")}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>Chapter ${escapeHtml(chapter.chapter)}: ${escapeHtml(chapter.title)} | The Divine Blueprint</title>`);
  html = html.replace(/(<section class="page-hero">[\s\S]*?<span class="section-kicker">)[\s\S]*?(<\/span>)/, `$1${escapeHtml(chapter.kicker || `Chapter ${chapter.chapter}`)}$2`);
  html = html.replace(/(<section class="page-hero">[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/, `$1${escapeHtml(chapter.title || "")}$2`);
  html = html.replace(/(<section class="page-hero">[\s\S]*?<p class="lead">)[\s\S]*?(<\/p>)/, `$1${escapeHtml(chapter.introduction || "")}$2`);
  html = html.replace(/<article class="prose">[\s\S]*?<\/article>/, chapterArticle(chapter, teachings));
  html = html.replace(/<aside class="sidebar">[\s\S]*?<\/aside>/, chapterSidebar(chapter));
  html = stripCmsMainOverrides(html);
  await writeFile(path, html, "utf8");
  return true;
}

function chapterOverviewCard(chapter, teachings) {
  const count = teachings.filter((item) => Number(item.chapter) === Number(chapter.chapter)).length;
  return `<div class="resource-card"><span class="status ${count ? "" : "soon"}">${count ? `${count} teaching${count === 1 ? "" : "s"} available` : "Series in development"}</span><h3>${escapeHtml(chapter.title || "")}</h3><p>${escapeHtml(chapter.teachingOutline?.length || 0)}-part teaching outline</p><a class="btn btn-secondary" href="/chapter-${escapeHtml(chapter.chapter)}#teaching-series">${count ? "View chapter teachings →" : "See episode outline →"}</a></div>`;
}

async function updateTeachingsPage(chapters, teachings, path) {
  if (!existsSync(path)) return false;
  let html = await readFile(path, "utf8");
  html = addStyles(html);
  const published = teachings.length
    ? `<div class="section-head"><span class="section-kicker">Latest Resources</span><h2>Published Teachings</h2><p>Watch, listen, read, or download the newest chapter-based teachings.</p></div><div class="grid resource-grid">${teachings.map(teachingCard).join("")}</div>`
    : `<div class="teaching-empty"><strong>Teachings are being prepared.</strong><br>Published teaching entries added through the admin page will appear here automatically.</div>`;
  const overview = `<div class="section-head" style="margin-top:3rem"><span class="section-kicker">Nine-Chapter Series</span><h2>Browse by Chapter</h2><p>Open a chapter to see its teaching outline and every published resource connected to it.</p></div><div class="grid resource-grid">${chapters.map((chapter) => chapterOverviewCard(chapter, teachings)).join("")}</div>`;
  const section = `<section class="section"><div class="container">${published}${overview}</div></section>`;
  html = html.replace(/<section class="section"><div class="container"><div class="grid resource-grid">[\s\S]*?<\/section>/, section);
  html = stripCmsMainOverrides(html, 2);
  await writeFile(path, html, "utf8");
  return true;
}

function replaceHeadMetadata(prefix, teaching) {
  let updated = prefix;
  updated = updated.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(teaching.summary || "Divine Blueprint teaching")}">`);
  updated = updated.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(teaching.title || "Teaching")} | The Divine Blueprint</title>`);
  if (!updated.includes('<base href="/">')) updated = updated.replace("<head>", '<head>\n<base href="/">');
  return addStyles(updated);
}

async function generateTeachingPages(teachings, teachingsSourcePath) {
  const source = await readFile(teachingsSourcePath, "utf8");
  const [rawPrefix, remainder] = source.split('<main id="main">');
  const rawSuffix = remainder.split("</main>")[1];
  const outputRoot = join(siteRoot, "teaching");
  await rm(outputRoot, { recursive: true, force: true });

  for (const teaching of teachings) {
    const directory = join(outputRoot, teaching._slug);
    await mkdir(directory, { recursive: true });
    const prefix = replaceHeadMetadata(rawPrefix, teaching);
    const image = safeUrl(teaching.thumbnail);
    const date = displayDate(teaching.publishDate);
    const details = [
      teaching.chapter ? `Chapter ${teaching.chapter}` : "",
      teaching.format || "",
      teaching.speaker || "",
      teaching.duration || "",
      date
    ].filter(Boolean);
    const body = `<main id="main"><section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="/">Home</a> / <a href="/teachings">Teachings</a> / ${escapeHtml(teaching.title || "Teaching")}</div><span class="section-kicker">${escapeHtml(teaching.seriesTitle || `Chapter ${teaching.chapter || ""} Teaching`)}</span><h1>${escapeHtml(teaching.title || "Untitled Teaching")}</h1><p class="lead">${escapeHtml(teaching.summary || "")}</p></div></section><section class="section"><div class="container"><article class="prose teaching-detail">${image ? `<img class="teaching-card-image" src="${escapeHtml(image)}" alt="${escapeHtml(teaching.thumbnailAlt || teaching.title || "Teaching image")}">` : ""}<div class="teaching-card-meta">${details.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>${mediaBlock(teaching)}<div class="teaching-body">${renderMarkdown(teaching.body || "")}</div><div class="teaching-actions"><a class="btn btn-secondary" href="/teachings">← All teachings</a><a class="btn btn-primary" href="/chapter-${escapeHtml(teaching.chapter || 1)}#teaching-series">Chapter resources →</a></div></article></div></section></main>`;
    const canonical = `<link rel="canonical" href="${publicOrigin}/teaching/${escapeHtml(teaching._slug)}/">`;
    const page = `${prefix.replace("</head>", `${canonical}\n</head>`)}<main id="main">${body.split('<main id="main">')[1].split('</main>')[0]}</main>${rawSuffix}`;
    await writeFile(join(directory, "index.html"), page, "utf8");
  }
}

if (!existsSync(siteRoot)) throw new Error("Divine Blueprint site must be built before applying admin content.");
if (!existsSync(chapterRoot)) throw new Error(`Missing ${chapterRoot}.`);

const chapters = (await readJsonFiles(chapterRoot)).sort((a, b) => Number(a.chapter) - Number(b.chapter));
const teachings = (await readJsonFiles(teachingRoot))
  .filter((item) => String(item.status || "draft").toLowerCase() === "published")
  .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || dateValue(b.publishDate) - dateValue(a.publishDate));

let pagesUpdated = 0;
for (const chapter of chapters) {
  const candidates = [join(siteRoot, `chapter-${chapter.chapter}.html`), join(siteRoot, `chapter-${chapter.chapter}`, "index.html")];
  for (const path of candidates) if (await updateChapterPage(chapter, teachings, path)) pagesUpdated += 1;
}

const teachingsCandidates = [join(siteRoot, "teachings.html"), join(siteRoot, "teachings", "index.html")];
for (const path of teachingsCandidates) if (await updateTeachingsPage(chapters, teachings, path)) pagesUpdated += 1;
if (existsSync(teachingsCandidates[0])) await generateTeachingPages(teachings, teachingsCandidates[0]);

console.log(`Applied easy-admin chapter resources and ${teachings.length} published teaching(s) to ${pagesUpdated} Divine Blueprint pages.`);
