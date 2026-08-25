import fs from 'node:fs';
import path from 'node:path';

// Netlify Forms detection is enabled; keep this form present at build time for deploy-time processing.
const siteDir = path.resolve('_site/divine-blueprint-site');
const ambassadorPath = path.join(siteDir, 'ambassadors', 'index.html');
const thanksPath = path.join(siteDir, 'ambassadors', 'thanks', 'index.html');
const formName = 'divine-blueprint-ambassador-application';
const runtimeMarker = 'data-ambassador-netlify-runtime="true"';

if (!fs.existsSync(ambassadorPath)) throw new Error(`Ambassador page not found: ${ambassadorPath}`);
if (!fs.existsSync(thanksPath)) throw new Error(`Ambassador thank-you page not found: ${thanksPath}`);

let html = fs.readFileSync(ambassadorPath, 'utf8');
const formPattern = new RegExp(`<form\\b[^>]*name=["']${formName}["'][^>]*>[\\s\\S]*?<\\/form>`, 'i');
const existingForm = html.match(formPattern)?.[0] || '';
if (!existingForm) throw new Error('Ambassador application form not found.');

let form = existingForm.replace(
  /<form\b[^>]*name=["']divine-blueprint-ambassador-application["'][^>]*>/i,
  `<form class="contact-form ambassador-form" name="${formName}" method="POST" action="/ambassadors/thanks/" accept-charset="UTF-8" data-netlify="true" netlify-honeypot="bot-field">`
);

if (!/name=["']form-name["']/i.test(form)) {
  form = form.replace(/<form\b[^>]*>/i, `$&\n      <input type="hidden" name="form-name" value="${formName}">`);
}

if (!/name=["']subject["']/i.test(form)) {
  form = form.replace(
    /(<input\s+type=["']hidden["']\s+name=["']form-name["'][^>]*>)/i,
    `$1\n      <input type="hidden" name="subject" data-remove-prefix value="New Divine Blueprint Ambassador Application">\n      <input type="hidden" name="application-source" value="Divine Blueprint Ambassador Program">`
  );
}

form = form.replace(
  /<button\b([^>]*)type=["']submit["']([^>]*)>\s*Submit Application\s*→?\s*<\/button>/i,
  '<button$1type="submit"$2 data-ambassador-submit>Submit Application →</button>'
);

if (!/data-ambassador-submit-status/i.test(form)) {
  form = form.replace(
    /(<button\b[^>]*data-ambassador-submit[^>]*>)/i,
    '<p class="form-note ambassador-submit-status" data-ambassador-submit-status aria-live="polite"></p>\n      $1'
  );
}

html = html.replace(formPattern, form);

const runtime = `<script ${runtimeMarker}>
(() => {
  const form = document.querySelector('form[name="${formName}"]');
  if (!form) return;
  const button = form.querySelector('[data-ambassador-submit]');
  const status = form.querySelector('[data-ambassador-submit-status]');
  let submitting = false;

  form.addEventListener('submit', async (event) => {
    if (submitting) {
      event.preventDefault();
      return;
    }
    if (!form.checkValidity()) return;

    event.preventDefault();
    submitting = true;
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.textContent = 'Submitting…';
    }
    if (status) status.textContent = 'Sending your application securely…';

    try {
      const encoded = new URLSearchParams();
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value === 'string') encoded.append(key, value);
      }

      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encoded.toString()
      });

      if (!response.ok) throw new Error('Form submission was not accepted.');
      window.location.assign('/ambassadors/thanks/');
    } catch (error) {
      submitting = false;
      if (button) {
        button.disabled = false;
        button.removeAttribute('aria-disabled');
        button.textContent = 'Submit Application →';
      }
      if (status) status.textContent = 'We could not submit your application. Please check your connection and try again.';
      console.error('Ambassador application submission failed:', error);
    }
  });
})();
</script>`;

if (!html.includes(runtimeMarker)) {
  html = html.replace('</body>', `${runtime}\n</body>`);
}

fs.writeFileSync(ambassadorPath, html);

const finalHtml = fs.readFileSync(ambassadorPath, 'utf8');
const finalForm = finalHtml.match(formPattern)?.[0] || '';
const requiredChecks = [
  [/method=["']POST["']/i, 'POST method'],
  [/action=["']\/ambassadors\/thanks\/["']/i, 'success-page action'],
  [/data-netlify=["']true["']/i, 'Netlify form detection attribute'],
  [/netlify-honeypot=["']bot-field["']/i, 'Netlify honeypot'],
  [new RegExp(`name=["']form-name["'][^>]*value=["']${formName}["']`, 'i'), 'hidden form-name field'],
  [/name=["']email["'][^>]*type=["']email["'][^>]*required/i, 'required email field'],
  [/type=["']submit["'][^>]*data-ambassador-submit/i, 'functional submit button'],
  [/data-ambassador-submit-status/i, 'submission status message']
];

for (const [pattern, label] of requiredChecks) {
  if (!pattern.test(finalForm)) throw new Error(`Ambassador application is missing ${label}.`);
}
if (!finalHtml.includes(runtimeMarker) || !finalHtml.includes("fetch('/',")) {
  throw new Error('Ambassador Netlify submission runtime was not installed.');
}
if (!fs.readFileSync(thanksPath, 'utf8').includes('Thank You for Applying')) {
  throw new Error('Ambassador success page is missing expected confirmation copy.');
}

console.log('Ambassador application submission enabled with Netlify Forms, AJAX feedback, spam protection, and success redirect.');
