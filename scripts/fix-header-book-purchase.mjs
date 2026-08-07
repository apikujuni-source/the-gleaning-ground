import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const assetPath = join(siteRoot, "assets", "header-book-purchase-fix.js");
const config = JSON.parse(await readFile("content/divine-blueprint/purchase.json", "utf8"));
const runtimeUrl = "/assets/header-book-purchase-fix.js?v=20260806-1";
const runtimeTag = `<script src="${runtimeUrl}"></script>`;
const statusPath = join(siteRoot, "header-book-purchase-status.txt");

if (!existsSync(siteRoot)) throw new Error(`Missing Divine Blueprint build: ${siteRoot}`);

const runtime = `(function () {
  'use strict';

  var MODAL_ID = 'book-purchase-modal';
  var FALLBACK_URL = ${JSON.stringify(config.amazonPaperbackUrl)};
  var observer = null;
  var lastTrigger = null;

  function textOf(element) {
    return ((element && element.textContent) || '')
      .replace(/\\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isHeaderPurchaseControl(element) {
    if (!element || !element.closest('header') || element.closest('#' + MODAL_ID)) return false;
    if (element.matches('[data-book-purchase-open]')) return true;
    return /^(?:get|buy|order|purchase|preorder)(?:\\s+the)?\\s+book(?:\\s*[→↗›»]*)?$/.test(textOf(element));
  }

  function tagHeaderControls(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('header a,header button,header [role="button"]').forEach(function (element) {
      if (!isHeaderPurchaseControl(element)) return;
      element.setAttribute('data-book-purchase-open', '');
      element.setAttribute('aria-haspopup', 'dialog');
      element.setAttribute('aria-controls', MODAL_ID);
      element.removeAttribute('data-modal-open');
      element.style.pointerEvents = 'auto';
      element.style.position = element.style.position || 'relative';
      element.style.zIndex = element.style.zIndex || '3';
    });
  }

  function hideLegacyStoreModal() {
    document.querySelectorAll('.modal,[role="dialog"]').forEach(function (element) {
      if (element.id === MODAL_ID) return;
      var text = textOf(element);
      if (text.indexOf('book ordering is ready to connect') !== -1 || text.indexOf('store connection') !== -1) {
        element.hidden = true;
        element.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function openPurchaseModal(trigger) {
    var modal = document.getElementById(MODAL_ID);
    if (!modal) {
      if (FALLBACK_URL) window.location.assign(FALLBACK_URL);
      return;
    }

    hideLegacyStoreModal();
    lastTrigger = trigger || document.activeElement;
    modal.hidden = false;
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('book-purchase-open');
    document.body.classList.add('book-purchase-open');

    var focusTarget = modal.querySelector('[data-book-purchase-initial-focus]') || modal.querySelector('a[href],button');
    if (focusTarget) window.requestAnimationFrame(function () { focusTarget.focus(); });
  }

  function interceptHeaderPurchase(event) {
    var target = event.target && event.target.closest
      ? event.target.closest('a,button,[role="button"]')
      : null;
    if (!isHeaderPurchaseControl(target)) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    openPurchaseModal(target);
  }

  function initialize() {
    tagHeaderControls(document);
    hideLegacyStoreModal();

    if (!observer && document.body) {
      observer = new MutationObserver(function (records) {
        var shouldRetag = records.some(function (record) {
          return record.type === 'childList' || record.type === 'characterData';
        });
        if (shouldRetag) tagHeaderControls(document);
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  window.addEventListener('click', interceptHeaderPurchase, true);
  window.addEventListener('pageshow', initialize);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
`;

function stripTags(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isPurchaseLabel(inner) {
  return /^(?:get|buy|order|purchase|preorder)(?:\s+the)?\s+book(?:\s*[→↗›»]*)?$/.test(stripTags(inner));
}

function addAttribute(attrs, name, value = "") {
  const pattern = new RegExp(`\\s${name}(?:=(['"])[\\s\\S]*?\\1)?`, "gi");
  let updated = attrs.replace(pattern, "");
  return `${updated} ${name}${value ? `="${value}"` : ""}`;
}

function patchHeader(html) {
  let controls = 0;
  const updated = html.replace(/<header\b[\s\S]*?<\/header>/gi, (header) => header.replace(
    /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs, inner) => {
      if (!isPurchaseLabel(inner)) return match;
      controls += 1;
      let nextAttrs = attrs.replace(/\sdata-modal-open(?:=(['"])[\s\S]*?\1)?/gi, "");
      nextAttrs = addAttribute(nextAttrs, "data-book-purchase-open");
      nextAttrs = addAttribute(nextAttrs, "aria-haspopup", "dialog");
      nextAttrs = addAttribute(nextAttrs, "aria-controls", "book-purchase-modal");
      if (tag.toLowerCase() === "a") nextAttrs = addAttribute(nextAttrs, "href", "#book-purchase-modal");
      return `<${tag}${nextAttrs}>${inner}</${tag}>`;
    }
  ));
  return { html: updated, controls };
}

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

await writeFile(assetPath, runtime, "utf8");

let pageCount = 0;
let controlCount = 0;
for (const page of await htmlFiles(siteRoot)) {
  let html = await readFile(page, "utf8");
  const patched = patchHeader(html);
  if (!patched.controls) continue;

  html = patched.html.replace(
    /\s*<script\b[^>]*src=["']\/assets\/header-book-purchase-fix\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,
    ""
  );
  html = html.replace("</body>", `${runtimeTag}\n</body>`);

  if (!html.includes('id="book-purchase-modal"')) {
    throw new Error(`${page} has a header purchase control but no purchase modal.`);
  }
  if (!html.includes(runtimeUrl)) {
    throw new Error(`${page} is missing the header purchase repair runtime.`);
  }

  await writeFile(page, html, "utf8");
  pageCount += 1;
  controlCount += patched.controls;
}

if (!pageCount || !controlCount) {
  throw new Error("No header Get the Book controls were found to repair.");
}

await writeFile(
  statusPath,
  [
    "HEADER_BOOK_PURCHASE=FIXED",
    "VERSION=2026-08-06-1",
    `PAGES=${pageCount}`,
    `CONTROLS=${controlCount}`,
    `RUNTIME=${runtimeUrl}`
  ].join("\n") + "\n",
  "utf8"
);

console.log(`Repaired ${controlCount} header book-purchase control(s) across ${pageCount} page(s).`);
