import fs from 'node:fs';
import path from 'node:path';

const settingsPath = path.resolve('content/page-settings/global/divine-blueprint.json');
if (!fs.existsSync(settingsPath)) throw new Error(`Missing ${settingsPath}`);

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

const header = settings.sections?.find((section) => section.label === 'Header & navigation');
const footer = settings.sections?.find((section) => section.label === 'Footer');
if (!header || !footer) throw new Error('Divine Blueprint global navigation/footer settings are incomplete.');

function replaceCanonicalLinks(section, labelsToReplace, specs) {
  const labels = new Set(labelsToReplace);
  section.linkFields = (section.linkFields || []).filter((item) => !labels.has(item.label));
  for (const spec of specs) section.linkFields.push(spec);
}

// Ambassadors and Church Partners now live inside the generated "Partner With Us"
// dropdown. Keep them out of the header CMS runtime fields so positional XPath
// rewrites cannot rename the dropdown items after JavaScript loads.
replaceCanonicalLinks(
  header,
  ['Link — Ambassadors', 'Link — Church Partners', 'Link — Give a Copy', 'Link — Partner With Us'],
  [
    {
      label: 'Link — Give a Copy',
      xpath: '/html/body/header/div/nav/a[4]',
      textEditable: true,
      text: 'Give a Copy',
      url: '/give-a-copy'
    }
  ]
);

replaceCanonicalLinks(
  footer,
  ['Link — Ambassadors', 'Link — Church Partners', 'Link — Give a Copy'],
  [
    {
      label: 'Link — Ambassadors',
      xpath: '/html/body/footer/div/div[1]/div[4]/a[4]',
      textEditable: true,
      text: 'Ambassadors',
      url: '/ambassadors'
    },
    {
      label: 'Link — Church Partners',
      xpath: '/html/body/footer/div/div[1]/div[4]/a[5]',
      textEditable: true,
      text: 'Church Partners',
      url: '/church-partners'
    },
    {
      label: 'Link — Give a Copy',
      xpath: '/html/body/footer/div/div[1]/div[4]/a[6]',
      textEditable: true,
      text: 'Give a Copy',
      url: '/give-a-copy'
    }
  ]
);

const expectedHeader = [
  ['Link — Give a Copy', '/html/body/header/div/nav/a[4]', '/give-a-copy']
];
const forbiddenHeader = ['Link — Ambassadors', 'Link — Church Partners', 'Link — Partner With Us'];
const expectedFooter = [
  ['Link — Ambassadors', '/html/body/footer/div/div[1]/div[4]/a[4]', '/ambassadors'],
  ['Link — Church Partners', '/html/body/footer/div/div[1]/div[4]/a[5]', '/church-partners'],
  ['Link — Give a Copy', '/html/body/footer/div/div[1]/div[4]/a[6]', '/give-a-copy']
];

for (const [label, xpath, url] of expectedHeader) {
  const matches = header.linkFields.filter((item) => item.label === label);
  if (matches.length !== 1) throw new Error(`Header & navigation: expected exactly one ${label}, found ${matches.length}`);
  if (matches[0].xpath !== xpath || matches[0].url !== url) {
    throw new Error(`Header & navigation: ${label} selector/url is not canonical.`);
  }
}
for (const label of forbiddenHeader) {
  const count = header.linkFields.filter((item) => item.label === label).length;
  if (count !== 0) throw new Error(`Header & navigation: stale ${label} field remains.`);
}
for (const [label, xpath, url] of expectedFooter) {
  const matches = footer.linkFields.filter((item) => item.label === label);
  if (matches.length !== 1) throw new Error(`Footer: expected exactly one ${label}, found ${matches.length}`);
  if (matches[0].xpath !== xpath || matches[0].url !== url) {
    throw new Error(`Footer: ${label} selector/url is not canonical.`);
  }
}

fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
console.log('Normalized Divine Blueprint CMS navigation settings for Partner With Us dropdown and Give a Copy.');
