import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const navigationPath = "src/_data/navigation.json";
const headerPath = "src/_includes/partials/header.njk";
const stylesPath = "src/assets/css/styles.css";
const resourceHubUrl = "https://divineblueprint.gleaningground.com/bible-studies";

for (const path of [navigationPath, headerPath, stylesPath]) {
  if (!existsSync(path)) throw new Error(`Missing main-site navigation source: ${path}`);
}

const navigation = JSON.parse(await readFile(navigationPath, "utf8"));
if (!Array.isArray(navigation)) throw new Error("Main-site navigation must be an array.");

const resourceIndexes = navigation
  .map((item, index) => (["Teachings", "Resources"].includes(item?.label) ? index : -1))
  .filter((index) => index >= 0);

if (!resourceIndexes.length) {
  throw new Error("Could not find the existing Teachings or Resources navigation items.");
}

const insertAt = Math.min(...resourceIndexes);
const consolidated = navigation.filter((item) => !["Teachings", "Resources"].includes(item?.label));
consolidated.splice(insertAt, 0, { label: "Resources", url: resourceHubUrl });
await writeFile(navigationPath, `${JSON.stringify(consolidated, null, 2)}\n`, "utf8");

const headerMarker = "data-main-resources-menu";
let header = await readFile(headerPath, "utf8");
if (!header.includes(headerMarker)) {
  const originalLoop = `      {% for item in navigation %}
        <a href="{{ item.url }}" {% if page.url == item.url or (item.url != '/' and page.url.startsWith(item.url)) %}aria-current="page"{% endif %}>{{ item.label }}</a>
      {% endfor %}`;

  const resourceLoop = `      {% for item in navigation %}
        {% if item.label == 'Resources' %}
          <div class="main-nav-dropdown" data-main-resources-menu>
            <a class="main-nav-resource-link" href="{{ item.url }}" {% if page.url.startsWith('/teachings/') or page.url.startsWith('/resources/') %}aria-current="page"{% endif %}>Resources <span class="main-nav-dropdown-chevron" aria-hidden="true">▾</span></a>
            <div class="main-nav-dropdown-menu" aria-label="Resources">
              <span class="main-nav-dropdown-label">The Divine Blueprint</span>
              <a href="https://divineblueprint.gleaningground.com/bible-studies">Bible Studies</a>
              <a href="https://divineblueprint.gleaningground.com/teachings">Teaching Series</a>
              <a href="https://divineblueprint.gleaningground.com/podcast">Podcast</a>
              <a href="https://divineblueprint.gleaningground.com/companion">Companion Journal</a>
              <span class="main-nav-dropdown-label main-nav-dropdown-label-local">The Gleaning Ground</span>
              <a href="/teachings/">Teachings</a>
              <a href="/resources/">Guides &amp; Downloads</a>
            </div>
          </div>
        {% else %}
          <a href="{{ item.url }}" {% if page.url == item.url or (item.url != '/' and page.url.startsWith(item.url)) %}aria-current="page"{% endif %}>{{ item.label }}</a>
        {% endif %}
      {% endfor %}`;

  if (!header.includes(originalLoop)) {
    throw new Error("Could not locate the main navigation loop in the header template.");
  }
  header = header.replace(originalLoop, resourceLoop);
  await writeFile(headerPath, header, "utf8");
}

const cssMarker = "/* CONSOLIDATED MAIN-SITE RESOURCES MENU */";
let styles = await readFile(stylesPath, "utf8");
if (!styles.includes(cssMarker)) {
  styles += `

${cssMarker}
.main-nav-dropdown{position:relative;display:flex;align-items:center}
.main-nav-dropdown>.main-nav-resource-link{display:inline-flex;align-items:center;gap:.32rem}
.main-nav-dropdown-chevron{font-size:.72em;transition:transform .18s ease}
.main-nav-dropdown-menu{position:absolute;z-index:140;top:calc(100% + .45rem);left:50%;display:none;width:268px;padding:.7rem;background:var(--paper);border:1px solid var(--line);border-radius:14px;box-shadow:0 20px 48px rgba(23,57,47,.18);transform:translateX(-50%)}
.main-nav-dropdown:hover .main-nav-dropdown-menu,.main-nav-dropdown:focus-within .main-nav-dropdown-menu{display:grid}
.main-nav-dropdown:hover .main-nav-dropdown-chevron,.main-nav-dropdown:focus-within .main-nav-dropdown-chevron{transform:rotate(180deg)}
.main-nav .main-nav-dropdown-menu a{display:block;padding:.62rem .72rem;border:0;border-radius:8px;line-height:1.3}
.main-nav .main-nav-dropdown-menu a:hover,.main-nav .main-nav-dropdown-menu a:focus-visible{background:#ece6d9;color:var(--terracotta)}
.main-nav-dropdown-label{padding:.35rem .72rem .2rem;color:var(--muted);font-size:.67rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
.main-nav-dropdown-label-local{margin-top:.4rem;padding-top:.65rem;border-top:1px solid var(--line)}
@media(max-width:1050px){.main-nav-dropdown{display:grid;width:100%}.main-nav-dropdown>.main-nav-resource-link{width:100%;justify-content:space-between}.main-nav-dropdown-menu{position:static;display:grid;width:100%;margin:.1rem 0 .35rem;padding:.35rem 0 .35rem .75rem;border:0;border-left:2px solid var(--gold);border-radius:0;box-shadow:none;background:transparent;transform:none}.main-nav-dropdown-chevron{transform:rotate(180deg)}.main-nav .main-nav-dropdown-menu a{padding:.55rem .75rem}.main-nav-dropdown-label{padding-left:.75rem}}
`;
  await writeFile(stylesPath, styles, "utf8");
}

console.log("Consolidated the main-site Teachings and Resources links into one Divine Blueprint-connected Resources menu.");
