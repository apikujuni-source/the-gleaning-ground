import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const publishRoot = "_site";
const siteRoot = join(publishRoot, "divine-blueprint-site");
const runtimeName = "companion-access-v4.js";
const runtimeSource = join("assets", runtimeName);
const runtimeOutput = join(siteRoot, "assets", runtimeName);
const runtimeTag = `<script src="/assets/${runtimeName}?v=20260804-4"></script>`;
const confirmationUrl = "https://gleaningground.com/companion-access-confirmed/";
const inlineUnlock = `(function(){try{localStorage.setItem('divineBlueprintCompanionAccess.v1','granted')}catch(e){}var f=document.getElementById('companion-access-form-panel');var s=document.getElementById('companion-download-access');if(f)f.hidden=true;if(s)s.hidden=false;document.querySelectorAll('[data-journal-download]').forEach(function(a){a.hidden=false;a.removeAttribute('aria-disabled');a.removeAttribute('tabindex');if(a.dataset.journalLabel)a.textContent=a.dataset.journalLabel;});}())`;

const pagePaths = [
  join(siteRoot, "companion.html"),
  join(siteRoot, "companion", "index.html")
];

function hardenForm(html, pagePath) {
  const formPattern = /<form\b[\s\S]*?\bid=["']companion-access-form["'][\s\S]*?>/i;
  const match = html.match(formPattern);
  if (!match) throw new Error(`Companion access form was not found in ${pagePath}.`);

  let formTag = match[0]
    .replace(/\saction=["'][^"']*["']/i, "")
    .replace(/\starget=["'][^"']*["']/i, "")
    .replace(/\sonsubmit=["'][\s\S]*?["']/i, "");

  formTag = formTag.replace(/>$/, ` action="${confirmationUrl}" target="companion-access-submission" onsubmit="${inlineUnlock};">`);
  let updated = html.replace(formPattern, formTag);

  if (!updated.includes('name="companion-access-submission"')) {
    updated = updated.replace(
      /(<div\b[^>]*\bid=["']companion-access-form-panel["'][^>]*>)/i,
      `$1\n<iframe name="companion-access-submission" title="Companion registration response" class="companion-submission-frame" aria-hidden="true"></iframe>`
    );
  }

  if (!updated.includes(".companion-submission-frame{")) {
    updated = updated.replace(
      "</style>",
      ".companion-submission-frame{position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none}</style>"
    );
  }

  updated = updated.replace(
    /\s*<script\b[^>]*src=["']\/assets\/(?:companion-download-fix|companion-access-v4)\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,
    ""
  );
  if (!updated.includes(runtimeTag)) updated = updated.replace("</body>", `${runtimeTag}\n</body>`);

  if (!updated.includes(`action="${confirmationUrl}"`) || !updated.includes('target="companion-access-submission"')) {
    throw new Error(`Companion form hardening did not verify in ${pagePath}.`);
  }
  return updated;
}

const confirmationPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Companion Journal Access Confirmed</title><style>body{margin:0;background:#f6f0e5;color:#17324d;font-family:Arial,sans-serif}.wrap{max-width:760px;margin:8vh auto;padding:42px;background:#fff;border-radius:20px;box-shadow:0 20px 55px rgba(14,45,77,.12);text-align:center}h1{font-family:Georgia,serif;font-size:clamp(2rem,6vw,3.5rem);margin:.35em 0}.k{color:#9a6b1f;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:.78rem}.actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:28px}.btn{display:inline-block;padding:14px 20px;border-radius:9px;background:#0e2d4d;color:#fff;text-decoration:none;font-weight:700}.btn.alt{background:#b9872c}</style></head><body><main class="wrap"><div class="k">Access confirmed</div><h1>Your Companion Journal is ready</h1><p>Thank you for registering your copy of <em>The Divine Blueprint</em>.</p><div class="actions"><a class="btn" href="https://divineblueprint.gleaningground.com/assets/downloads/The-Divine-Blueprint-Companion-Fillable.pdf">Download Fillable PDF</a><a class="btn alt" href="https://divineblueprint.gleaningground.com/assets/downloads/The-Divine-Blueprint-Companion-Print-Ready.pdf">Download Print Edition</a></div><p><a href="https://divineblueprint.gleaningground.com/companion?journal-access=granted#download-editions">Return to the Companion page</a></p></main></body></html>`;

await mkdir(join(siteRoot, "assets"), { recursive: true });
await copyFile(runtimeSource, runtimeOutput);

for (const pagePath of pagePaths) {
  const html = await readFile(pagePath, "utf8");
  await writeFile(pagePath, hardenForm(html, pagePath), "utf8");
}

const confirmationDirectory = join(publishRoot, "companion-access-confirmed");
await mkdir(confirmationDirectory, { recursive: true });
await writeFile(join(confirmationDirectory, "index.html"), confirmationPage, "utf8");

console.log("Installed Companion form v4: hidden submission target, static confirmation fallback, and cache-busted runtime.");
