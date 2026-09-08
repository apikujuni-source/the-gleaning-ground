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
const nameInputPattern = /<input\b[^>]*name=["']name["'][^>]*>/gi;
const existingNameInputs = form.match(nameInputPattern) || [];

if (existingNameInputs.length === 0) {
  const nameField = `      <label>Full name
        <input name="name" type="text" autocomplete="name" placeholder="Your full name" required>
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
} else if (existingNameInputs.length > 1) {
  throw new Error('Ambassador application contains more than one name field.');
}

html = html.replace(formPattern, form);
fs.writeFileSync(ambassadorPath, html, 'utf8');

const finalHtml = fs.readFileSync(ambassadorPath, 'utf8');
const finalForm = finalHtml.match(formPattern)?.[0] || '';
const finalNameInputs = finalForm.match(nameInputPattern) || [];
if (finalNameInputs.length !== 1) {
  throw new Error(`Expected exactly one ambassador name field; found ${finalNameInputs.length}.`);
}
if (!/name=["']name["'][^>]*type=["']text["'][^>]*required/i.test(finalNameInputs[0]) &&
    !/type=["']text["'][^>]*name=["']name["'][^>]*required/i.test(finalNameInputs[0])) {
  throw new Error('Ambassador name field must be a required text input.');
}
if (!/Full name/i.test(finalForm)) {
  throw new Error('Ambassador application is missing the Full name label.');
}

console.log('Ensured one required Full name field on the Divine Blueprint ambassador application.');
