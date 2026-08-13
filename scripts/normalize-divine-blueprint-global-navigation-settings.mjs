import fs from 'node:fs';
import path from 'node:path';

const settingsPath = path.resolve('content/page-settings/global/divine-blueprint.json');
if (!fs.existsSync(settingsPath)) throw new Error(`Missing ${settingsPath}`);

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

const header = settings.sections?.find((section) => section.label === 'Header & navigation');
const footer = settings.sections?.find((section) => section.label === 'Footer');
if (!header || !footer) throw new Error('Divine Blueprint global navigation/footer settings are incomplete.');

function replaceCanonicalLinks(section, specs) {
  const labels = new Set(specs.map((item) => item.label));
  section.linkFields = (section.linkFields || []).filter((item) => !labels.has(item.label));
  for (const spec of specs) section.linkFields.push(spec);
}

replaceCanonicalLinks(header, [
  {
    label: 'Link — Ambassadors',
    xpath: '/html/body/header/div/nav/a[4]',
    textEditable: true,
    text: 'Ambassadors',
    url: '/ambassadors'
  },
  {
    label: 'Link — Church Partners',
    xpath: '/html/body/header/div/nav/a[5]',
    textEditable: true,
    text: 'Church Partners',
    url: '/church-partners'
  },
  {
    label: 'Link — Give a Copy',
    xpath: '/html/body/header/div/nav/a[6]',
    textEditable: true,
    text: 'Give a Copy',
    url: '/give-a-copy'
  }
]);

replaceCanonicalLinks(footer, [
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
]);

const expected = [
  ['Header & navigation', 'Link — Ambassadors', '/html/body/header/div/nav/a[4]', '/ambassadors'],
  ['Header & navigation', 'Link — Church Partners', '/html/body/header/div/nav/a[5]', '/church-partners'],
  ['Header & navigation', 'Link — Give a Copy', '/html/body/header/div/nav/a[6]', '/give-a-copy'],
  ['Footer', 'Link — Ambassadors', '/html/body/footer/div/div[1]/div[4]/a[4]', '/ambassadors'],
  ['Footer', 'Link — Church Partners', '/html/body/footer/div/div[1]/div[4]/a[5]', '/church-partners'],
  ['Footer', 'Link — Give a Copy', '/html/body/footer/div/div[1]/div[4]/a[6]', '/give-a-copy']
];

for (const [sectionLabel, label, xpath, url] of expected) {
  const section = settings.sections.find((item) => item.label === sectionLabel);
  const matches = section.linkFields.filter((item) => item.label === label);
  if (matches.length !== 1) throw new Error(`${sectionLabel}: expected exactly one ${label}, found ${matches.length}`);
  if (matches[0].xpath !== xpath || matches[0].url !== url) {
    throw new Error(`${sectionLabel}: ${label} selector/url is not canonical.`);
  }
}

fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
console.log('Normalized Divine Blueprint CMS navigation settings: Ambassadors, Church Partners, Give a Copy.');
