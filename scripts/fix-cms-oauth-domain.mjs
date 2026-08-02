import { readFile, writeFile } from "node:fs/promises";
import YAML from "yaml";

const adminHtmlPath = "_site/admin/index.html";
const adminConfigPath = "_site/admin/config.yml";
const oauthDomain = "gleaningground.com";

const configText = await readFile(adminConfigPath, "utf8");
const config = YAML.parse(configText);

config.backend = {
  ...config.backend,
  base_url: "https://api.netlify.com",
  auth_endpoint: "auth",
  site_domain: oauthDomain
};
config.load_config_file = false;

await writeFile(adminConfigPath, YAML.stringify(config), "utf8");

let html = await readFile(adminHtmlPath, "utf8");
const inlineConfig = JSON.stringify(config).replaceAll("<", "\\u003c");
const initPattern = /init\(\{ config: .* \}\);/;

if (!initPattern.test(html)) {
  throw new Error("Could not locate the embedded CMS initialization configuration.");
}

html = html.replace(initPattern, `init({ config: ${inlineConfig} });`);
await writeFile(adminHtmlPath, html, "utf8");

console.log(`Configured Decap CMS OAuth to use Netlify site domain ${oauthDomain}.`);
