import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const outputAssetDirectory = join(siteRoot, "assets");
const outputAsset = join(outputAssetDirectory, "companion-download-fix.js");
const scriptTag = '<script src="/assets/companion-download-fix.js"></script>';
const accessMarker = 'id="companion-access-gate"';
const fillablePath = "/assets/downloads/The-Divine-Blueprint-Companion-Fillable.pdf";
const printPath = "/assets/downloads/The-Divine-Blueprint-Companion-Print-Ready.pdf";

const accessGate = `
<section class="section companion-access-section" id="companion-access-gate" aria-labelledby="companion-access-title">
  <div class="container">
    <div class="companion-access-shell">
      <div class="companion-access-intro">
        <span class="section-kicker">Included With Your Book</span>
        <h2 id="companion-access-title">Register to Access Your Companion Journal</h2>
        <p>Every copy of <em>The Divine Blueprint</em> includes personal access to the digital Companion Journal. Tell us a little about your purchase, then choose the edition that best fits your journey.</p>
        <ol class="companion-access-steps" aria-label="Access steps">
          <li><span>1</span><strong>Enter your reader details</strong></li>
          <li><span>2</span><strong>Confirm your purchase source</strong></li>
          <li><span>3</span><strong>Download your preferred journal</strong></li>
        </ol>
        <div class="companion-access-note">
          <strong>Your privacy matters.</strong>
          <p>We use these details to provide journal access and understand how readers discover the book. Receiving ministry news is optional.</p>
        </div>
      </div>

      <div class="companion-access-form-panel" id="companion-access-form-panel">
        <form
          id="companion-access-form"
          name="divine-blueprint-companion-access"
          method="POST"
          action="/companion?journal-access=granted#download-editions"
          data-netlify="true"
          netlify-honeypot="company"
        >
          <input type="hidden" name="form-name" value="divine-blueprint-companion-access">
          <p class="companion-honeypot" aria-hidden="true">
            <label>Leave this field empty <input name="company" tabindex="-1" autocomplete="off"></label>
          </p>

          <div class="companion-form-heading">
            <span>Reader registration</span>
            <h3>Unlock your journal</h3>
            <p>Required fields are marked with an asterisk.</p>
          </div>

          <div class="companion-form-grid">
            <label class="companion-field companion-field-full">
              <span>Full name <b aria-hidden="true">*</b></span>
              <input type="text" name="name" autocomplete="name" required placeholder="Your first and last name">
            </label>

            <label class="companion-field companion-field-full">
              <span>Email address <b aria-hidden="true">*</b></span>
              <input type="email" name="email" autocomplete="email" required placeholder="you@example.com">
            </label>

            <label class="companion-field">
              <span>Country <b aria-hidden="true">*</b></span>
              <input type="text" name="country" autocomplete="country-name" required placeholder="Country of residence">
            </label>

            <label class="companion-field">
              <span>Edition purchased <b aria-hidden="true">*</b></span>
              <select name="edition_purchased" required>
                <option value="">Select an edition</option>
                <option>Paperback</option>
                <option>Kindle eBook</option>
                <option>Another eBook edition</option>
                <option>Gift copy</option>
              </select>
            </label>

            <label class="companion-field companion-field-full">
              <span>Purchase source <b aria-hidden="true">*</b></span>
              <select name="purchase_source" required>
                <option value="">Where did you get the book?</option>
                <option>Amazon.com</option>
                <option>Another Amazon marketplace</option>
                <option>The Gleaning Ground website</option>
                <option>Church or ministry</option>
                <option>Bookstore</option>
                <option>Conference or event</option>
                <option>Received as a gift</option>
                <option>Other</option>
              </select>
            </label>

            <label class="companion-field companion-field-full">
              <span>Order number, receipt number, or access code <small>(optional)</small></span>
              <input type="text" name="purchase_reference" autocomplete="off" placeholder="Add a reference when available">
            </label>
          </div>

          <label class="companion-check">
            <input type="checkbox" name="personal_use_agreement" value="accepted" required>
            <span>I understand that the Companion Journal is licensed for my personal use and may not be resold, uploaded, or redistributed. <b aria-hidden="true">*</b></span>
          </label>

          <label class="companion-check companion-check-optional">
            <input type="checkbox" name="ministry_updates" value="yes">
            <span>I would also like occasional teachings, book updates, and resources from The Gleaning Ground.</span>
          </label>

          <button class="btn btn-primary companion-access-submit" type="submit">Unlock the Companion Journal</button>
          <p class="companion-access-status" id="companion-access-status" role="status" aria-live="polite"></p>
          <p class="companion-privacy-copy">By requesting access, you acknowledge our <a href="/privacy">Privacy &amp; Tracking notice</a>. Marketing consent is optional and is not required to access the journal.</p>
        </form>
      </div>

      <div class="companion-download-access" id="companion-download-access" hidden>
        <span class="companion-access-check" aria-hidden="true">✓</span>
        <span class="section-kicker">Access Confirmed</span>
        <h3>Your Companion Journal is ready</h3>
        <p>Choose either the fillable digital edition or the print-ready personal edition below. You may return to this page on this device without registering again.</p>
        <a class="btn btn-primary" href="#download-editions">Choose Your Edition ↓</a>
      </div>
    </div>
  </div>
</section>
<style>
  html{scroll-behavior:smooth}
  .companion-access-section{background:linear-gradient(135deg,#f7f1e6 0%,#fffdf8 58%,#eef4f6 100%);border-top:1px solid rgba(185,135,44,.22);border-bottom:1px solid rgba(14,45,77,.1)}
  .companion-access-shell{display:grid;grid-template-columns:minmax(0,.92fr) minmax(380px,1.08fr);gap:clamp(34px,6vw,76px);align-items:start}
  .companion-access-intro{padding-top:10px}
  .companion-access-intro h2{max-width:640px;margin:.65rem 0 1rem;color:#0e2d4d;font-size:clamp(2rem,4vw,3.4rem);line-height:1.05}
  .companion-access-intro>p{max-width:650px;font-size:1.08rem;line-height:1.75;color:#465363}
  .companion-access-steps{display:grid;gap:13px;margin:30px 0;padding:0;list-style:none}
  .companion-access-steps li{display:flex;align-items:center;gap:13px;color:#0e2d4d}
  .companion-access-steps li span{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#0e2d4d;color:#fff;font-weight:800;box-shadow:0 7px 18px rgba(14,45,77,.15)}
  .companion-access-note{max-width:620px;padding:18px 20px;border-left:4px solid #b9872c;background:rgba(255,255,255,.72)}
  .companion-access-note p{margin:.35rem 0 0;line-height:1.6;color:#53606d}
  .companion-access-form-panel{padding:clamp(24px,4vw,38px);border:1px solid rgba(14,45,77,.14);border-radius:22px;background:#fff;box-shadow:0 24px 65px rgba(14,45,77,.12)}
  .companion-form-heading span{color:#9a6b1f;font-size:.76rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
  .companion-form-heading h3{margin:.35rem 0 .35rem;color:#0e2d4d;font-size:clamp(1.7rem,3vw,2.25rem)}
  .companion-form-heading p{margin:0 0 22px;color:#69737d;font-size:.9rem}
  .companion-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px}
  .companion-field{display:grid;gap:7px;color:#25384b;font-size:.9rem;font-weight:700}
  .companion-field-full{grid-column:1/-1}
  .companion-field span b,.companion-check b{color:#a33b2f}
  .companion-field small{font-weight:500;color:#737d87}
  .companion-field input,.companion-field select{width:100%;min-height:50px;padding:12px 14px;border:1px solid #c7d0d8;border-radius:10px;background:#fff;color:#122a40;font:inherit;box-sizing:border-box;transition:border-color .2s,box-shadow .2s}
  .companion-field input:focus,.companion-field select:focus{outline:none;border-color:#b9872c;box-shadow:0 0 0 4px rgba(185,135,44,.14)}
  .companion-check{display:flex;gap:11px;align-items:flex-start;margin-top:19px;color:#465363;font-size:.9rem;line-height:1.55}
  .companion-check input{flex:0 0 auto;width:18px;height:18px;margin-top:3px;accent-color:#0e2d4d}
  .companion-check-optional{margin-top:12px}
  .companion-access-submit{width:100%;justify-content:center;margin-top:22px;min-height:52px;border:0;cursor:pointer}
  .companion-access-submit:disabled{cursor:wait;opacity:.72}
  .companion-access-status{min-height:1.45em;margin:12px 0 0;text-align:center;font-size:.9rem;font-weight:700}
  .companion-access-status[data-state="success"]{color:#1f7045}
  .companion-access-status[data-state="error"]{color:#9c342c}
  .companion-access-status[data-state="loading"]{color:#75551c}
  .companion-privacy-copy{margin:12px 0 0;text-align:center;color:#69737d;font-size:.78rem;line-height:1.5}
  .companion-privacy-copy a{color:#0e2d4d;text-decoration:underline}
  .companion-honeypot{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}
  .companion-download-access{grid-column:1/-1;max-width:760px;margin:0 auto;padding:clamp(34px,5vw,54px);border:1px solid rgba(52,126,83,.26);border-radius:22px;background:#fff;text-align:center;box-shadow:0 24px 65px rgba(14,45,77,.12)}
  .companion-download-access h3{margin:.45rem 0 .75rem;color:#0e2d4d;font-size:clamp(2rem,4vw,3rem)}
  .companion-download-access p{max-width:630px;margin:0 auto 24px;line-height:1.7;color:#53606d}
  .companion-access-check{display:grid;place-items:center;width:64px;height:64px;margin:0 auto 18px;border-radius:50%;background:#e2f2e8;color:#24734a;font-size:2rem;font-weight:900}
  [data-journal-download][hidden]{display:none!important}
  @media(max-width:900px){.companion-access-shell{grid-template-columns:1fr}.companion-access-intro{padding-top:0}}
  @media(max-width:620px){.companion-form-grid{grid-template-columns:1fr}.companion-field-full{grid-column:auto}.companion-access-form-panel{padding:22px 18px}.companion-access-section .container{padding-left:16px;padding-right:16px}}
</style>`;

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }

  return files;
}

function isCompanionPage(page) {
  const publicPath = relative(siteRoot, page).replaceAll("\\", "/");
  return publicPath === "companion.html" || publicPath === "companion/index.html";
}

function lockDownload(html, path, edition, label) {
  const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<a\\b([^>]*?)href=(["'])${escapedPath}\\2([^>]*)>`, "gi");

  return html.replace(pattern, (match, before, quote, after) => {
    if (/data-journal-download=/i.test(match)) return match;
    return `<a${before}href=${quote}${path}${quote}${after} data-journal-download="${edition}" data-journal-label="${label}" hidden aria-disabled="true" tabindex="-1">`;
  });
}

function installAccessGate(html) {
  let updated = html;

  if (!updated.includes(accessMarker)) {
    const downloadSection = /<section\b[^>]*\bid=["'](?:download-editions|companion-downloads)["'][^>]*>/i;
    if (downloadSection.test(updated)) updated = updated.replace(downloadSection, `${accessGate}\n$&`);
    else updated = updated.replace("</main>", `${accessGate}\n</main>`);
  }

  updated = lockDownload(updated, fillablePath, "fillable", "Download Fillable PDF ↓");
  updated = lockDownload(updated, printPath, "print", "Download Print Edition ↓");
  return updated;
}

await mkdir(outputAssetDirectory, { recursive: true });
await copyFile("assets/companion-download-fix.js", outputAsset);

const pages = await findHtmlFiles(siteRoot);
let injectedPages = 0;
let gatedPages = 0;

for (const page of pages) {
  let html = await readFile(page, "utf8");
  let changed = false;

  if (isCompanionPage(page)) {
    const gatedHtml = installAccessGate(html);
    if (gatedHtml !== html) {
      html = gatedHtml;
      changed = true;
      gatedPages += 1;
    }
  }

  if (!html.includes(scriptTag) && html.includes("</body>")) {
    html = html.replace("</body>", `${scriptTag}\n</body>`);
    changed = true;
    injectedPages += 1;
  }

  if (changed) await writeFile(page, html, "utf8");
}

await writeFile(
  join(siteRoot, "companion-fix-status.txt"),
  [
    "COMPANION_ACCESS_GATE=ACTIVE",
    "VERSION=2026-08-04-2",
    "PUBLIC_ROUTE=/companion#companion-access",
    "FORM_NAME=divine-blueprint-companion-access",
    "BEHAVIOR=Reader registration is required before journal download links are revealed",
    `GATED_COMPANION_PAGES=${gatedPages}`,
    `INJECTED_HTML_PAGES=${injectedPages}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Installed the Companion access gate on ${gatedPages} page(s) and injected runtime support into ${injectedPages} page(s).`);
