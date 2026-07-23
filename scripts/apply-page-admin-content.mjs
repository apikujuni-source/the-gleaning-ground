import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  writeFile
} from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

const mainRoot = resolve("_site");
const divineRoot = resolve("_site/divine-blueprint-site");
const settingsRoot = resolve("content/page-settings");
const runtimeMarker = "cms-page-data";

const runtime = `(() => {
  const source = document.getElementById("cms-page-data");
  if (!source) return;

  const warn = (message, item) => {
    if (window.console && console.warn) console.warn("[CMS page content]", message, item || "");
  };
  const find = (xpath) => {
    try {
      return document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
    } catch (error) {
      warn("Invalid page selector", { xpath, error });
      return null;
    }
  };

  let page;
  try {
    page = JSON.parse(source.textContent || "{}");
  } catch (error) {
    warn("Could not read the page settings", error);
    return;
  }

  if (page.seo) {
    if (typeof page.seo.title === "string" && page.seo.title.trim()) {
      document.title = page.seo.title;
    }
    if (typeof page.seo.description === "string") {
      let description = document.querySelector('meta[name="description"]');
      if (!description) {
        description = document.createElement("meta");
        description.name = "description";
        document.head.appendChild(description);
      }
      description.content = page.seo.description;
    }
  }

  for (const section of page.sections || []) {
    for (const item of section.textFields || []) {
      const element = find(item.xpath);
      if (!element) {
        warn("Text target was not found", item);
        continue;
      }
      if (item.mode === "html") element.innerHTML = item.value ?? "";
      else element.textContent = item.value ?? "";
    }

    for (const item of section.linkFields || []) {
      const element = find(item.xpath);
      if (!element) {
        warn("Link target was not found", item);
        continue;
      }
      if (typeof item.url === "string") element.setAttribute("href", item.url);
      if (item.textEditable && typeof item.text === "string") {
        element.textContent = item.text;
      }
    }

    for (const item of section.imageFields || []) {
      const element = find(item.xpath);
      if (!element) {
        warn("Image target was not found", item);
        continue;
      }
      if (typeof item.src === "string" && item.src) element.setAttribute("src", item.src);
      if (typeof item.alt === "string") element.setAttribute("alt", item.alt);
    }

    for (const item of section.attributeFields || []) {
      const element = find(item.xpath);
      if (!element) {
        warn("Field target was not found", item);
        continue;
      }
      if (typeof item.attribute === "string" && item.attribute) {
        element.setAttribute(item.attribute, item.value ?? "");
      }
    }
  }
})();`;

const runtimeHash = createHash("sha256").update(runtime).digest("hex").slice(0, 12);
const runtimeUrl = `/assets/js/cms-page-editor-${runtimeHash}.js`;

async function listFiles(directory, predicate = () => true) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path, predicate)));
    else if (predicate(path)) files.push(path);
  }
  return files;
}

async function readSettings() {
  const paths = await listFiles(settingsRoot, (path) => path.endsWith(".json"));
  const settings = [];

  for (const path of paths) {
    const value = JSON.parse(await readFile(path, "utf8"));
    if (!["main", "divine"].includes(value.target)) {
      throw new Error(`Invalid page settings target in ${relative(process.cwd(), path)}`);
    }
    if (typeof value.pagePath !== "string" || !Array.isArray(value.sections)) {
      throw new Error(`Incomplete page settings in ${relative(process.cwd(), path)}`);
    }
    settings.push({ path, value });
  }
  return settings;
}

function pageCandidates(target, pagePath) {
  const root = target === "main" ? mainRoot : divineRoot;
  if (pagePath === "/") return [join(root, "index.html")];

  const cleanPath = pagePath.replace(/^\/+|\/+$/g, "");
  if (!cleanPath) return [join(root, "index.html")];
  if (cleanPath.endsWith(".html")) return [join(root, cleanPath)];
  return [join(root, cleanPath, "index.html"), join(root, `${cleanPath}.html`)];
}

async function allPublicHtml(target) {
  const root = target === "main" ? mainRoot : divineRoot;
  return listFiles(root, (path) => {
    if (!path.endsWith(".html")) return false;
    if (target === "main" && path.startsWith(`${divineRoot}/`)) return false;
    if (target === "main" && path.startsWith(`${join(mainRoot, "admin")}/`)) return false;
    return true;
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function copyAndVersionUpload(src) {
  if (typeof src !== "string" || !src) return src;
  const normalized = src.startsWith("assets/") ? `/${src}` : src;
  if (!normalized.startsWith("/assets/uploads/")) return normalized;

  const relativePath = normalized.replace(/^\/+/, "");
  const source = join(mainRoot, relativePath);
  if (!existsSync(source)) {
    throw new Error(`CMS image does not exist in the build: ${relativePath}`);
  }

  const bytes = await readFile(source);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const extension = extname(relativePath).toLowerCase();
  const stem = basename(relativePath, extname(relativePath));
  const versionedRelative = join(
    dirname(relativePath),
    `${stem}-${hash}${extension}`
  ).replace(/\\/g, "/");

  for (const root of [mainRoot, divineRoot]) {
    const destination = join(root, versionedRelative);
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination);
  }
  return `/${versionedRelative}`;
}

async function prepareForPage(value) {
  const prepared = clone(value);
  for (const section of prepared.sections || []) {
    for (const image of section.imageFields || []) {
      image.src = await copyAndVersionUpload(image.src);
    }
  }
  return prepared;
}

function mergePage(globalValue, pageValue) {
  const merged = {
    adminTitle: pageValue?.adminTitle || globalValue?.adminTitle || "",
    target: pageValue?.target || globalValue?.target || "",
    pagePath: pageValue?.pagePath || "*",
    sections: [
      ...(globalValue?.sections || []),
      ...(pageValue?.sections || [])
    ]
  };
  if (pageValue?.seo) merged.seo = pageValue.seo;
  return merged;
}

function inject(html, page) {
  const safeJson = JSON.stringify(page).replace(/</g, "\\u003c");
  const block = `<script id="${runtimeMarker}" type="application/json">${safeJson}</script>
<script src="${runtimeUrl}" defer></script>`;
  const existing = new RegExp(
    `<script id="${runtimeMarker}"[\\\\s\\\\S]*?<\\\\/script>\\\\s*<script src="[^"]*cms-page-editor-[^"]+" defer><\\\\/script>`,
    "g"
  );
  const cleaned = html.replace(existing, "");
  if (cleaned.includes("</body>")) return cleaned.replace("</body>", `${block}\\n</body>`);
  return `${cleaned}\\n${block}\\n`;
}

async function writeRuntime() {
  const relativePath = runtimeUrl.replace(/^\/+/, "");
  for (const root of [mainRoot, divineRoot]) {
    const destination = join(root, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, runtime, "utf8");
  }
}

if (!existsSync(settingsRoot)) {
  throw new Error("Missing content/page-settings. The admin page settings were not installed.");
}
if (!existsSync(mainRoot) || !existsSync(divineRoot)) {
  throw new Error("Both public sites must be built before applying admin page content.");
}

const mainUploads = join(mainRoot, "assets/uploads");
if (existsSync(mainUploads)) {
  await mkdir(join(divineRoot, "assets/uploads"), { recursive: true });
  await cp(mainUploads, join(divineRoot, "assets/uploads"), { recursive: true });
}

const settings = await readSettings();
const globals = new Map();
const pages = [];
for (const item of settings) {
  if (item.value.pagePath === "*") globals.set(item.value.target, item.value);
  else pages.push(item);
}

const assignments = new Map();
for (const target of ["main", "divine"]) {
  const globalValue = globals.get(target);
  if (!globalValue) throw new Error(`Missing global ${target} page settings.`);
  for (const path of await allPublicHtml(target)) {
    assignments.set(path, { globalValue, pageValue: null });
  }
}

for (const { path: settingsPath, value } of pages) {
  const candidates = pageCandidates(value.target, value.pagePath);
  const matches = candidates.filter((path) => existsSync(path));
  if (!matches.length) {
    throw new Error(
      `No built page matches ${relative(process.cwd(), settingsPath)} (${value.pagePath})`
    );
  }
  for (const path of matches) {
    assignments.set(path, {
      globalValue: globals.get(value.target),
      pageValue: value
    });
  }
}

await writeRuntime();

let updated = 0;
for (const [path, values] of assignments) {
  const page = await prepareForPage(mergePage(values.globalValue, values.pageValue));
  const original = await readFile(path, "utf8");
  await writeFile(path, inject(original, page), "utf8");
  updated += 1;
}

console.log(
  `Applied admin-managed page content to ${updated} HTML files using ${runtimeUrl}.`
);
