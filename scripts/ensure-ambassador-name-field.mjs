import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const ambassadorPath = path.join(siteDir, 'ambassadors', 'index.html');
const formName = 'divine-blueprint-ambassador-application';
const cmsPageDataPattern = /<script\s+id=["']cms-page-data["'][^>]*>([\s\S]*?)<\/script>/i;

if (!fs.existsSync(ambassadorPath)) {
  throw new Error(`Ambassador page not found: ${ambassadorPath}`);
}

let html = fs.readFileSync(ambassadorPath, 'utf8');
const formPattern = new RegExp(`<form\\b[^>]*name=["']${formName}["'][^>]*>[\\s\\S]*?<\\/form>`, 'i');
const existingForm = html.match(formPattern)?.[0] || '';
if (!existingForm) throw new Error('Ambassador application form not found.');

let form = existingForm;
const canonicalNamePattern = /<input\b[^>]*name=["']applicant-name["'][^>]*>/gi;
const legacyNamePattern = /<input\b[^>]*name=["']name["'][^>]*type=["']text["'][^>]*>|<input\b[^>]*type=["']text["'][^>]*name=["']name["'][^>]*>/gi;

let canonicalInputs = form.match(canonicalNamePattern) || [];
const legacyInputs = form.match(legacyNamePattern) || [];

if (canonicalInputs.length > 1 || legacyInputs.length > 1 || (canonicalInputs.length && legacyInputs.length)) {
  throw new Error('Ambassador application contains conflicting applicant name fields.');
}

if (canonicalInputs.length === 0 && legacyInputs.length === 1) {
  form = form.replace(legacyNamePattern, (input) => {
    let updated = input.replace(/name=["']name["']/i, 'name="applicant-name"');
    if (!/data-ambassador-name-input/i.test(updated)) {
      updated = updated.replace(/<input\b/i, '<input data-ambassador-name-input="true"');
    }
    if (!/maxlength=/i.test(updated)) {
      updated = updated.replace(/>$/, ' maxlength="160">');
    }
    return updated;
  });
} else if (canonicalInputs.length === 0) {
  const nameField = `      <label>Full name
        <input data-ambassador-name-input="true" name="applicant-name" type="text" autocomplete="name" placeholder="Your full name" maxlength="160" required>
      </label>\n`;

  const emailLabelPattern = /<label\b[^>]*class=["'][^"']*ambassador-email-field[^"']*["'][^>]*>/i;
  if (emailLabelPattern.test(form)) {
    form = form.replace(emailLabelPattern, `${nameField}$&`);
  } else {
    const emailInputPattern = /<label\b[^>]*>[\s\S]*?<input\b[^>]*name=["']email["'][^>]*>[\s\S]*?<\/label>/i;
    if (!emailInputPattern.test(form)) {
      throw new Error('Could not locate the ambassador email field to place Full name before it.');
    }
    form = form.replace(emailInputPattern, `${nameField}$&`);
  }
}

if (!/data-ambassador-name-mirror/i.test(form)) {
  const formNameField = new RegExp(`(<input\\s+type=["']hidden["']\\s+name=["']form-name["'][^>]*value=["']${formName}["'][^>]*>)`, 'i');
  if (!formNameField.test(form)) throw new Error('Could not locate hidden form-name field for name mirror.');
  form = form.replace(formNameField, '$1\n      <input type="hidden" name="name" value="" data-ambassador-name-mirror="true">');
}

html = html.replace(formPattern, form);

// The Ambassador page is created from the homepage shell after the general
// CMS page-content pass has already run. Without narrowing the inherited page
// data, the homepage newsletter XPath targets the Ambassador form at runtime
// and replaces the Full name label (including its input). Keep only shared
// header/footer settings on this page and give it page-specific metadata.
const cmsPageDataMatch = html.match(cmsPageDataPattern);
if (cmsPageDataMatch) {
  let cmsPageData;
  try {
    cmsPageData = JSON.parse(cmsPageDataMatch[1]);
  } catch (error) {
    throw new Error(`Could not parse inherited Ambassador CMS page data: ${error.message}`);
  }

  const sharedSections = (cmsPageData.sections || []).filter((section) => {
    const fields = [
      ...(section.textFields || []),
      ...(section.linkFields || []),
      ...(section.imageFields || []),
      ...(section.attributeFields || [])
    ];
    return fields.length > 0 && fields.every((field) =>
      /^\/html\/body\/(?:header|footer)\//.test(String(field.xpath || ''))
    );
  });

  const ambassadorPageData = {
    ...cmsPageData,
    adminTitle: 'Divine Blueprint — Ambassador Program Page',
    target: 'divine',
    pagePath: '/ambassadors',
    sections: sharedSections,
    seo: {
      title: 'Ambassador Program | The Divine Blueprint',
      description: 'Apply to become a Divine Blueprint Ambassador and help share the book responsibly.'
    }
  };
  const safeJson = JSON.stringify(ambassadorPageData).replace(/</g, '\\u003c');
  html = html.replace(cmsPageDataPattern, (block) => block.replace(cmsPageDataMatch[1], safeJson));
}

fs.writeFileSync(ambassadorPath, html, 'utf8');

const finalHtml = fs.readFileSync(ambassadorPath, 'utf8');
const finalForm = finalHtml.match(formPattern)?.[0] || '';
const finalCanonical = finalForm.match(canonicalNamePattern) || [];
const finalMirrors = finalForm.match(/<input\b[^>]*data-ambassador-name-mirror[^>]*>/gi) || [];
const finalLegacyVisible = finalForm.match(legacyNamePattern) || [];

if (finalCanonical.length !== 1) {
  throw new Error(`Expected exactly one canonical applicant-name field; found ${finalCanonical.length}.`);
}
if (!/type=["']text["']/i.test(finalCanonical[0]) || !/\brequired\b/i.test(finalCanonical[0]) || !/data-ambassador-name-input/i.test(finalCanonical[0])) {
  throw new Error('Applicant name field must be one required text input with the capture marker.');
}
if (finalMirrors.length !== 1 || !/name=["']name["']/i.test(finalMirrors[0]) || !/type=["']hidden["']/i.test(finalMirrors[0])) {
  throw new Error('Ambassador application must contain exactly one hidden backward-compatible name mirror.');
}
if (finalLegacyVisible.length !== 0) {
  throw new Error('Legacy visible name field remains after canonicalization.');
}
if (!/Full name/i.test(finalForm)) {
  throw new Error('Ambassador application is missing the Full name label.');
}

const finalPageDataMatch = finalHtml.match(cmsPageDataPattern);
if (finalPageDataMatch) {
  const finalPageData = JSON.parse(finalPageDataMatch[1]);
  const inheritedMainTargets = (finalPageData.sections || []).flatMap((section) => [
    ...(section.textFields || []),
    ...(section.linkFields || []),
    ...(section.imageFields || []),
    ...(section.attributeFields || [])
  ]).filter((field) => /^\/html\/body\/main\//.test(String(field.xpath || '')));
  if (inheritedMainTargets.length) {
    throw new Error('Ambassador page still contains inherited homepage main-content targets.');
  }
  if (finalPageData.pagePath !== '/ambassadors') {
    throw new Error('Ambassador CMS page data has the wrong page path.');
  }
}

console.log('Ensured required applicant-name capture plus backward-compatible name mirroring on the Divine Blueprint ambassador application.');
