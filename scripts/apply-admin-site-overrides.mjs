import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

const roots = {
  main: resolve("_site"),
  divine: resolve("_site/divine-blueprint-site")
};
const overrideRoots = [
  resolve("content/site-overrides/presets"),
  resolve("content/site-overrides/custom")
];
const statusFiles = {
  main: join(roots.main, "admin-site-overrides-status.json"),
  divine: join(roots.divine, "admin-site-overrides-status.json")
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listJsonFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
  return files.sort();
}

async function listPublicHtml(target, directory = roots[target]) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (target === "main" && (path === roots.divine || path === join(roots.main, "admin"))) continue;
      files.push(...await listPublicHtml(target, path));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(path);
    }
  }
  return files.sort();
}

async function pageCandidates(target, pagePath) {
  const root = roots[target];
  if (!root) throw new Error(`Unknown admin override target: ${target}`);
  const clean = String(pagePath || "/").trim();
  if (clean === "*") return listPublicHtml(target);
  if (!clean || clean === "/") return [join(root, "index.html")];
  const normalized = clean.replace(/^\/+|\/+$/g, "");
  if (!normalized) return [join(root, "index.html")];
  if (normalized.endsWith(".html")) return [join(root, normalized)];
  return [join(root, normalized, "index.html"), join(root, `${normalized}.html`)];
}

function replaceLiteral(html, from, to, all = false) {
  if (!from) return { html, count: 0 };
  if (all) {
    const count = html.split(from).length - 1;
    return { html: count ? html.split(from).join(to) : html, count };
  }
  const index = html.indexOf(from);
  if (index < 0) return { html, count: 0 };
  return { html: `${html.slice(0, index)}${to}${html.slice(index + from.length)}`, count: 1 };
}

function applyTextReplacement(html, item) {
  if (item.mode === "html") {
    return replaceLiteral(html, String(item.find || ""), String(item.value ?? ""), Boolean(item.all));
  }

  const rawFind = String(item.find || "");
  const escapedFind = escapeHtml(rawFind);
  const safeValue = escapeHtml(item.value ?? "");
  let result = replaceLiteral(html, rawFind, safeValue, Boolean(item.all));
  if (result.count || escapedFind === rawFind) return result;
  return replaceLiteral(html, escapedFind, safeValue, Boolean(item.all));
}

function replaceAttribute(html, attribute, from, to, all = false) {
  if (!from) return { html, count: 0 };
  const pattern = new RegExp(
    `(\\b${escapeRegExp(attribute)}\\s*=\\s*["'])${escapeRegExp(from)}(["'])`,
    all ? "gi" : "i"
  );
  let count = 0;
  const updated = html.replace(pattern, (_match, prefix, suffix) => {
    count += 1;
    return `${prefix}${to}${suffix}`;
  });
  return { html: updated, count };
}

function injectCss(html, css, key) {
  const marker = `data-admin-site-override="${key}"`;
  const existing = new RegExp(`\\s*<style ${escapeRegExp(marker)}>[\\s\\S]*?<\\/style>`, "gi");
  let updated = html.replace(existing, "");
  if (!String(css || "").trim()) return updated;
  const block = `<style ${marker}>\n${String(css).trim()}\n</style>`;
  if (updated.includes("</head>")) return updated.replace("</head>", `${block}\n</head>`);
  return `${block}\n${updated}`;
}

const files = (await Promise.all(overrideRoots.map(listJsonFiles))).flat();
const report = {
  generatedAt: new Date().toISOString(),
  overrideFiles: files.length,
  appliedFiles: 0,
  pageWrites: 0,
  replacements: 0,
  linkChanges: 0,
  imageChanges: 0,
  cssPages: 0,
  entries: []
};

for (const file of files) {
  const entry = JSON.parse(await readFile(file, "utf8"));
  if (entry.enabled === false) continue;
  if (!["main", "divine"].includes(entry.target)) {
    throw new Error(`${relative(process.cwd(), file)} has invalid target: ${entry.target}`);
  }
  if (typeof entry.pagePath !== "string") {
    throw new Error(`${relative(process.cwd(), file)} is missing pagePath.`);
  }

  const candidates = await pageCandidates(entry.target, entry.pagePath);
  const matches = candidates.filter(existsSync);
  if (!matches.length) {
    throw new Error(
      `${relative(process.cwd(), file)} does not match a built page (${entry.target}:${entry.pagePath}).`
    );
  }

  const entryReport = {
    file: relative(process.cwd(), file).replaceAll("\\", "/"),
    title: entry.adminTitle || basename(file),
    target: entry.target,
    pagePath: entry.pagePath,
    pages: []
  };

  for (const page of matches) {
    let html = await readFile(page, "utf8");
    const original = html;
    let replacementCount = 0;
    let linkCount = 0;
    let imageCount = 0;

    for (const item of entry.replacements || []) {
      if (!item || typeof item.find !== "string") continue;
      const result = applyTextReplacement(html, item);
      html = result.html;
      replacementCount += result.count;
      if (item.required !== false && result.count === 0 && String(item.value ?? "") !== String(item.find ?? "")) {
        throw new Error(
          `${entryReport.title}: could not find required ${item.mode === "html" ? "HTML" : "text"} field “${item.label || item.find}” in ${relative(process.cwd(), page)}.`
        );
      }
    }

    for (const item of entry.links || []) {
      if (!item || typeof item.from !== "string" || typeof item.to !== "string") continue;
      const result = replaceAttribute(html, "href", item.from, item.to, Boolean(item.all));
      html = result.html;
      linkCount += result.count;
      if (item.required !== false && result.count === 0 && item.from !== item.to) {
        throw new Error(`${entryReport.title}: link “${item.label || item.from}” was not found in ${relative(process.cwd(), page)}.`);
      }
    }

    for (const item of entry.images || []) {
      if (!item || typeof item.from !== "string" || typeof item.to !== "string") continue;
      const result = replaceAttribute(html, "src", item.from, item.to, Boolean(item.all));
      html = result.html;
      imageCount += result.count;
      if (item.required !== false && result.count === 0 && item.from !== item.to) {
        throw new Error(`${entryReport.title}: image “${item.label || item.from}” was not found in ${relative(process.cwd(), page)}.`);
      }
    }

    const css = String(entry.css || "").trim();
    const cssKey = `${entry.target}-${String(entry.pagePath).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}`;
    html = injectCss(html, css, cssKey);

    if (html !== original) {
      await writeFile(page, html, "utf8");
      report.pageWrites += 1;
    }

    report.replacements += replacementCount;
    report.linkChanges += linkCount;
    report.imageChanges += imageCount;
    if (css) report.cssPages += 1;
    entryReport.pages.push({
      page: relative(roots[entry.target], page).replaceAll("\\", "/"),
      replacements: replacementCount,
      links: linkCount,
      images: imageCount,
      css: Boolean(css)
    });
  }

  report.entries.push(entryReport);
  report.appliedFiles += 1;
}

const status = `${JSON.stringify(report, null, 2)}\n`;
for (const [target, path] of Object.entries(statusFiles)) {
  if (existsSync(roots[target])) await writeFile(path, status, "utf8");
}

console.log(
  `Applied ${report.appliedFiles} admin override file(s) across ${report.pageWrites} page write(s): ${report.replacements} text/HTML replacement(s), ${report.linkChanges} link change(s), ${report.imageChanges} image change(s), ${report.cssPages} page CSS override(s).`
);
