import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const outputDirectory = "_site/admin";
const sourceConfig = "cms/config.yml";
const outputConfig = `${outputDirectory}/config.yml`;
const outputIndex = `${outputDirectory}/index.html`;

if (!existsSync(sourceConfig)) {
  throw new Error(`Missing Decap CMS configuration: ${sourceConfig}`);
}

await mkdir(outputDirectory, { recursive: true });
await copyFile(sourceConfig, outputConfig);

const adminHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Gleaning Ground Content Manager</title>
  <link rel="cms-config-url" type="text/yaml" href="/admin/config.yml">
</head>
<body>
  <script src="https://unpkg.com/decap-cms@3.8.4/dist/decap-cms.js"></script>
</body>
</html>
`;

await writeFile(outputIndex, adminHtml, "utf8");
console.log("Verified /admin/index.html and /admin/config.yml in the published site.");
