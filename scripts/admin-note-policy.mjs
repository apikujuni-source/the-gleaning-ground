export const exactAdminFragments = [
  "teachings are being prepared",
  "teaching is being prepared",
  "published teaching entries added through the admin page will appear here automatically",
  "published teaching entries added through the cms page will appear here automatically"
];

export const adminOnlyRegexSources = [
  String.raw`\bteachings?\s+(?:are|is)\s+(?:(?:currently|still)\s+)?(?:being\s+)?prepared\b`,
  String.raw`\b(?:published|new|future)\s+(?:teaching|devotional|article|blog|resource|podcast|video|sermon|entry|entries|item|items|post|posts)s?\b[\s\S]{0,260}\b(?:admin|cms)(?:\s+(?:page|panel|dashboard|area))?\b[\s\S]{0,260}\b(?:appear|display|show)(?:\s+here)?(?:\s+automatically)?\b`,
  String.raw`\b(?:add|publish|manage|edit|create)(?:ed|ing)?\b[\s\S]{0,180}\b(?:through|from|using|via|in)\b[\s\S]{0,80}\b(?:the\s+)?(?:admin|cms)(?:\s+(?:page|panel|dashboard|area))?\b`,
  String.raw`\b(?:entries|items|posts|resources|teachings|content)\b[\s\S]{0,180}\b(?:will|would)\b[\s\S]{0,120}\b(?:appear|display|show)\b[\s\S]{0,120}\b(?:automatically|when\s+published|once\s+published|after\s+publication)\b`,
  String.raw`\b(?:placeholder|sample|demo|temporary)\s+(?:content|copy|text|message|entry|entries)\b[\s\S]{0,180}\b(?:admin|cms|editor)\b`,
  String.raw`\b(?:visible|shown|displayed)\s+(?:after|once|when)\b[\s\S]{0,120}\b(?:added|published|created)\b[\s\S]{0,120}\b(?:admin|cms)\b`,
  String.raw`\b(?:content|entries|posts|items|resources|teachings)\s+(?:added|published|created)\s+(?:through|from|using|via|in)\s+(?:the\s+)?(?:admin|cms)\b`,
  String.raw`\b(?:for|to)\s+(?:the\s+)?(?:site\s+)?admin(?:istrator)?\b[\s\S]{0,180}\b(?:add|edit|publish|manage|replace|update|configure)\b`,
  String.raw`\b(?:admin|cms|editor)\s+(?:note|instruction|placeholder|message)\b`
];

const adminOnlyPatterns = adminOnlyRegexSources.map((source) => new RegExp(source, "i"));

export function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function visibleText(value) {
  return decodeEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\u003c/gi, "<")
    .replace(/\\n|\\r|\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeText(value) {
  return visibleText(value)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^a-z0-9@._'/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAdminOnlyText(value) {
  const text = visibleText(value);
  if (!text) return false;
  const normalized = normalizeText(text);
  if (exactAdminFragments.some((fragment) => normalized.includes(fragment))) return true;
  if (text.length > 1200) return false;
  return adminOnlyPatterns.some((pattern) => pattern.test(text));
}
