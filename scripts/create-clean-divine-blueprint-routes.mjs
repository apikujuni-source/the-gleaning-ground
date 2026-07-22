import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const publicOrigin = "https://divineblueprint.gleaningground.com";

const topLevelEntries = await readdir(siteRoot, { withFileTypes: true });
const htmlFiles = topLevelEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name);

const cleanRoutes = new Map();
for (const fileName of htmlFiles) {
  const slug = basename(fileName, ".html");
  cleanRoutes.set(fileName.toLowerCase(), slug === "index" ? "/" : `/${slug}`);
  cleanRoutes.set(slug.toLowerCase(), slug === "index" ? "/" : `/${slug}`);
}

function normalizeInternalHref(rawHref) {
  const href = rawHref.trim();
  if (!href || href.startsWith("#") || /^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(href)) {
    return rawHref;
  }

  const suffixMatch = href.match(/([?#].*)$/);
  const suffix = suffixMatch ? suffixMatch[1] : "";
  let path = suffix ? href.slice(0, -suffix.length) : href;

  path = path.replace(/^\.\//, "");
  path = path.replace(/^\/divine-blueprint-site\//i, "");
  path = path.replace(/^divine-blueprint-site\//i, "");
  path = path.replace(/^\//, "");

  const lower = path.toLowerCase();
  const directRoute = cleanRoutes.get(lower);
  if (directRoute) return `${directRoute}${suffix}`;

  if (lower.endsWith(".html")) {
    const route = cleanRoutes.get(lower);
    if (route) return `${route}${suffix}`;
  }

  return rawHref;
}

function normalizeHtmlLinks(html) {
  return html.replace(/\bhref=(['"])(.*?)\1/gi, (_match, quote, href) => {
    const normalized = normalizeInternalHref(href);
    return `href=${quote}${normalized}${quote}`;
  });
}

function addCleanRouteMetadata(html, publicPath) {
  let updated = html;
  if (!updated.includes('<base href="/">')) {
    updated = updated.replace("<head>", '<head>\n<base href="/">');
  }
  if (!/rel=["']canonical["']/i.test(updated)) {
    updated = updated.replace(
      "</head>",
      `<link rel="canonical" href="${publicOrigin}${publicPath}">\n</head>`
    );
  }
  return updated;
}

for (const fileName of htmlFiles) {
  const sourcePath = join(siteRoot, fileName);
  const slug = basename(fileName, ".html");
  const publicPath = slug === "index" ? "/" : `/${slug}`;

  let html = await readFile(sourcePath, "utf8");
  html = normalizeHtmlLinks(html);
  await writeFile(sourcePath, html, "utf8");

  if (slug === "index") continue;

  const routeDirectory = join(siteRoot, slug);
  const routeIndex = join(routeDirectory, "index.html");
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(routeIndex, addCleanRouteMetadata(html, publicPath), "utf8");
}

// Normalize any already-generated nested HTML pages as well, including the
// Companion clean-route page created earlier in the build.
async function normalizeNestedPages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await normalizeNestedPages(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const html = await readFile(path, "utf8");
    const normalized = normalizeHtmlLinks(html)
      .replaceAll('/divine-blueprint-site/assets/', '/assets/')
      .replaceAll('divine-blueprint-site/assets/', '/assets/');
    if (normalized !== html) await writeFile(path, normalized, "utf8");
  }
}

await normalizeNestedPages(siteRoot);
console.log(`Created ${htmlFiles.length - 1} clean Divine Blueprint routes and normalized navigation links.`);
