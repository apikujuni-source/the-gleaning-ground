import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import YAML from "yaml";

const outputDirectory = "_site/admin";
const sourceConfig = "cms/config.yml";
const editorFragment = "cms/divine-blueprint-editor.yml";
const outputConfig = `${outputDirectory}/config.yml`;
const outputIndex = `${outputDirectory}/index.html`;

if (!existsSync(sourceConfig)) {
  throw new Error(`Missing Decap CMS configuration: ${sourceConfig}`);
}
if (!existsSync(editorFragment)) {
  throw new Error(`Missing Divine Blueprint editor configuration: ${editorFragment}`);
}

await mkdir(outputDirectory, { recursive: true });

let config = await readFile(sourceConfig, "utf8");
const fragment = (await readFile(editorFragment, "utf8")).trimEnd();
const insertionMarker = "collections:\n";

if (!config.includes("name: divine_chapter_resources")) {
  if (!config.includes(insertionMarker)) {
    throw new Error("Could not locate the CMS collection insertion point.");
  }
  config = config.replace(insertionMarker, `${insertionMarker}${fragment}\n\n`);
}

config = config
  .replace("    label: The Divine Blueprint\n", '    label: "3. Homepage & Book Cover"\n')
  .replace("    label: Divine Blueprint Pages\n", '    label: "Advanced — Divine Blueprint Pages"\n')
  .replace(
    '    description: "Edit the homepage, Start Here, all nine chapters, studies, teachings, podcast, companion, and ministry pages."',
    '    description: "Advanced section-by-section editor. Use Edit Chapter Resources and Upload & Publish Teachings for normal Divine Blueprint updates."'
  );

let parsedConfig;
try {
  parsedConfig = YAML.parse(config);
} catch (error) {
  throw new Error(`Invalid generated CMS configuration: ${error.message}`);
}

if (!parsedConfig || typeof parsedConfig !== "object" || !Array.isArray(parsedConfig.collections)) {
  throw new Error("Generated CMS configuration is missing its collections array.");
}

// Manual initialization embeds the complete configuration directly in the
// admin page. This removes the browser's dependency on fetching config.yml,
// while the YAML copy remains available for inspection and troubleshooting.
parsedConfig.load_config_file = false;
const inlineConfig = JSON.stringify(parsedConfig).replaceAll("<", "\\u003c");

await writeFile(outputConfig, config, "utf8");

const adminHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Gleaning Ground Content Manager</title>
  <style>
    :root{color-scheme:light}
    body{margin:0;background:#f4f1e9}
    .admin-help{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(360px,calc(100vw - 36px));font:14px/1.5 Arial,sans-serif;color:#102f50;background:#fff;border:1px solid #d6c49b;border-radius:14px;box-shadow:0 12px 36px rgba(8,31,55,.2)}
    .admin-help summary{cursor:pointer;padding:12px 15px;font-weight:700;background:#102f50;color:white;border-radius:13px;list-style:none}
    .admin-help summary::-webkit-details-marker{display:none}
    .admin-help div{padding:14px 16px}
    .admin-help ol{margin:.4rem 0 .7rem;padding-left:1.25rem}
    .admin-help li{margin:.35rem 0}
    .admin-help a{color:#8a6424;font-weight:700}
    .cms-startup-error{max-width:760px;margin:4rem auto;padding:1.25rem 1.4rem;font:16px/1.55 Arial,sans-serif;color:#6b1d1d;background:#fff;border:1px solid #d8a9a9;border-radius:14px}
  </style>
  <script>window.CMS_MANUAL_INIT = true;</script>
</head>
<body>
  <details class="admin-help">
    <summary>Divine Blueprint quick guide</summary>
    <div>
      <ol>
        <li><strong>Edit Chapter Resources</strong> changes Central Truth, studies, questions, journal prompts, declarations, and prayers.</li>
        <li><strong>Upload & Publish Teachings</strong> adds video, audio, written, podcast, or downloadable teachings.</li>
        <li>Keep a teaching as <strong>Draft</strong> while working. Change it to <strong>Published</strong> when it is ready for the website.</li>
      </ol>
      <a href="https://divineblueprint.gleaningground.com/teachings" target="_blank" rel="noopener">Open the teachings page ↗</a>
    </div>
  </details>
  <script src="https://unpkg.com/decap-cms@3.8.4/dist/decap-cms.js"></script>
  <script>
    (() => {
      try {
        const init = window.initCMS || window.CMS?.init;
        if (typeof init !== "function") {
          throw new Error("The Decap CMS application did not finish loading.");
        }
        init({ config: ${inlineConfig} });
      } catch (error) {
        console.error("CMS startup failed", error);
        const message = document.createElement("div");
        message.className = "cms-startup-error";
        message.innerHTML = "<strong>The content manager could not start.</strong><br>" +
          String(error?.message || error) +
          "<br><br>Reload the page once. If the problem remains, check the latest Netlify deployment log.";
        document.body.prepend(message);
      }
    })();
  </script>
</body>
</html>
`;

await writeFile(outputIndex, adminHtml, "utf8");
console.log(
  `Built the easy Divine Blueprint CMS with ${parsedConfig.collections.length} collections and embedded configuration.`
);
