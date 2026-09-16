import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const ambassadorPath = path.join(siteDir, 'ambassadors', 'index.html');
const formName = 'divine-blueprint-ambassador-application';

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

console.log('Ensured required applicant-name capture plus backward-compatible name mirroring on the Divine Blueprint ambassador application.');
