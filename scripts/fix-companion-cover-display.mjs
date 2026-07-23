import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const stylesPath = join(siteRoot, "assets", "styles.css");
const companionPages = [
  join(siteRoot, "companion.html"),
  join(siteRoot, "companion", "index.html")
];

const marker = "/* Companion full-cover display safeguard */";
let styles = await readFile(stylesPath, "utf8");
if (!styles.includes(marker)) {
  styles += `

${marker}
body.companion-page main img{
  max-width:100%!important;
  height:auto!important;
  object-fit:contain!important;
  object-position:center center!important;
  clip-path:none!important;
}
body.companion-page main [class*="cover"],
body.companion-page main [class*="book"],
body.companion-page main [class*="journal"],
body.companion-page main figure,
body.companion-page main picture{
  overflow:visible!important;
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
}
body.companion-page main img[src*="divine-blueprint-cover"]{
  display:block!important;
  width:min(380px,100%)!important;
  height:auto!important;
  max-height:none!important;
  margin-inline:auto!important;
  object-fit:contain!important;
  object-position:center center!important;
  transform:none!important;
}
@media (max-width:760px){
  body.companion-page main img[src*="divine-blueprint-cover"]{
    width:min(320px,92vw)!important;
  }
}
`;
  await writeFile(stylesPath, styles, "utf8");
}

for (const pagePath of companionPages) {
  let html = await readFile(pagePath, "utf8");
  if (/<body\b[^>]*class=/i.test(html)) {
    html = html.replace(/<body\b([^>]*class=(['"])(.*?)\2[^>]*)>/i, (_match, attrs, quote, classes) => {
      const classSet = new Set(classes.split(/\s+/).filter(Boolean));
      classSet.add("companion-page");
      return `<body${attrs.replace(/class=(['"])(.*?)\1/i, `class=${quote}${[...classSet].join(" ")}${quote}`)}>`;
    });
  } else {
    html = html.replace(/<body\b([^>]*)>/i, '<body$1 class="companion-page">');
  }
  html = html.replace(/object-fit\s*:\s*cover/gi, "object-fit:contain");
  await writeFile(pagePath, html, "utf8");
}

console.log("Companion cover and journal imagery will display at full aspect ratio without cropping.");
