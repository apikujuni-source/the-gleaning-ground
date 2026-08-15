import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const stylesPath = join(siteRoot, "assets", "styles.css");
const marker = "/* High-contrast Divine Blueprint footer logo */";

if (!existsSync(stylesPath)) {
  throw new Error(`Missing Divine Blueprint stylesheet: ${stylesPath}`);
}

function addClass(tag, className) {
  const classMatch = tag.match(/\bclass=(['"])(.*?)\1/i);
  if (classMatch) {
    const classes = new Set(classMatch[2].split(/\s+/).filter(Boolean));
    classes.add(className);
    return tag.replace(
      classMatch[0],
      `class=${classMatch[1]}${[...classes].join(" ")}${classMatch[1]}`
    );
  }
  return tag.replace(/\s*\/?\>$/, (ending) => ` class="${className}"${ending}`);
}

function markFooterBranding(html) {
  return html.replace(/<footer\b[\s\S]*?<\/footer>/gi, (footer) => {
    let updated = footer.replace(/<img\b[^>]*>/gi, (tag) => {
      const identity = tag.toLowerCase();
      if (!/(logo|brand|mark)/.test(identity)) return tag;
      return addClass(tag, "divine-footer-logo");
    });

    updated = updated.replace(
      /<a\b([^>]*)>([\s\S]*?the divine blueprint[\s\S]*?)<\/a>/i,
      (match, attributes, content) => {
        const openingTag = addClass(`<a${attributes}>`, "divine-footer-wordmark");
        return `${openingTag}${content}</a>`;
      }
    );

    return updated;
  });
}

async function findHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

let styles = await readFile(stylesPath, "utf8");
if (!styles.includes(marker)) {
  styles += `

${marker}
footer .divine-footer-wordmark,
footer .footer-brand,
footer .footer-logo,
footer .brand-logo,
footer .site-logo,
footer [class*="footer"][class*="brand"]{
  color:#fff4d6!important;
  opacity:1!important;
  text-shadow:0 1px 0 rgba(0,0,0,.25),0 0 18px rgba(201,155,64,.22)!important;
}

.ambassador-invite h2{
  color:#fff4d6!important;
  text-shadow:0 1px 0 rgba(0,0,0,.25),0 0 18px rgba(201,155,64,.18)!important;
}

footer img.divine-footer-logo,
footer img[alt*="logo" i],
footer img[src*="logo" i],
footer .footer-logo img,
footer .brand-logo img{
  opacity:1!important;
  filter:brightness(0) saturate(100%) invert(95%) sepia(18%) saturate(706%) hue-rotate(329deg) brightness(106%) contrast(101%) drop-shadow(0 2px 5px rgba(0,0,0,.28))!important;
}

footer svg.divine-footer-logo,
footer .footer-logo svg,
footer .brand-logo svg,
footer svg[class*="logo"]{
  color:#fff4d6!important;
  fill:#fff4d6!important;
  stroke:#fff4d6!important;
  opacity:1!important;
  filter:drop-shadow(0 2px 5px rgba(0,0,0,.28))!important;
}

footer .divine-footer-logo:hover,
footer .divine-footer-wordmark:hover{
  opacity:1!important;
}
`;
  await writeFile(stylesPath, styles, "utf8");
}

const pages = await findHtmlFiles(siteRoot);
let updatedPages = 0;
for (const page of pages) {
  const original = await readFile(page, "utf8");
  const updated = markFooterBranding(original);
  if (updated !== original) {
    await writeFile(page, updated, "utf8");
    updatedPages += 1;
  }
}

console.log(`Applied a warm ivory, high-contrast treatment to footer branding and the homepage Ambassador callout heading on ${updatedPages} Divine Blueprint pages.`);
