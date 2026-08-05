import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');

if (!fs.existsSync(siteDir)) {
  throw new Error(`Divine Blueprint site directory not found at ${siteDir}`);
}

function stripTags(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeHref(href = '') {
  let value = href.trim().toLowerCase();
  value = value.replace(/^https?:\/\/[^/]+/i, '');
  value = value.replace(/[?#].*$/, '');
  value = value.replace(/^(?:\.\.\/|\.\/)+/, '/');
  value = value.replace(/index\.html$/, '');
  value = value.replace(/\.html$/, '');
  value = value.replace(/\/+$/, '');
  if (!value || value === '.') return '/';
  return value.startsWith('/') ? value : `/${value}`;
}

function navigationKey(anchor) {
  const hrefMatch = anchor.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
  const hrefKey = normalizeHref(hrefMatch?.[2] || '');
  const textKey = stripTags(anchor);

  if (textKey === 'about' || hrefKey === '/about') return 'route:/about';
  if (hrefKey) return `route:${hrefKey}`;
  return `text:${textKey}`;
}

function dedupePrimaryNavigation(html) {
  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/gi;

  return html.replace(navPattern, (_match, open, links, close) => {
    const seen = new Set();
    const cleanedLinks = links.replace(/<a\b[\s\S]*?<\/a>/gi, (anchor) => {
      const key = navigationKey(anchor);
      if (seen.has(key)) return '';
      seen.add(key);
      return anchor;
    });

    return `${open}${cleanedLinks}${close}`;
  });
}

let filesUpdated = 0;
let duplicateAboutLinksRemoved = 0;

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    const before = fs.readFileSync(fullPath, 'utf8');
    const aboutBefore = (before.match(/<a\b[^>]*>\s*About\s*<\/a>/gi) || []).length;
    const after = dedupePrimaryNavigation(before);
    const aboutAfter = (after.match(/<a\b[^>]*>\s*About\s*<\/a>/gi) || []).length;

    if (after !== before) {
      fs.writeFileSync(fullPath, after);
      filesUpdated += 1;
      duplicateAboutLinksRemoved += Math.max(0, aboutBefore - aboutAfter);
    }
  }
}

walk(siteDir);

for (const entry of fs.readdirSync(siteDir, { recursive: true })) {
  if (!entry.endsWith('.html')) continue;
  const filePath = path.join(siteDir, entry);
  if (!fs.statSync(filePath).isFile()) continue;
  const html = fs.readFileSync(filePath, 'utf8');
  const navMatches = html.match(/<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>[\s\S]*?<\/nav>/gi) || [];
  for (const nav of navMatches) {
    const aboutCount = (nav.match(/<a\b[^>]*>\s*About\s*<\/a>/gi) || []).length;
    if (aboutCount > 1) {
      throw new Error(`Duplicate About links remain in ${filePath}`);
    }
  }
}

console.log(`Divine Blueprint header cleanup complete: ${filesUpdated} file(s) updated; ${duplicateAboutLinksRemoved} duplicate About link(s) removed.`);
