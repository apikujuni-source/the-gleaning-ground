import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
const ccEmail = 'apikujuni@gmail.com';
const fromEmail = 'info@gleaningground.com';

let html = await readFile(indexPath, 'utf8');

// Keep the generated mailto value useful as a compact carrier for the approved
// ambassador's email and referral link, and as a human-readable fallback record.
const oldReturn = "return 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);";
const ccReturn = "return 'mailto:' + encodeURIComponent(email) + '?cc=' + encodeURIComponent('" + ccEmail + "') + '&subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);";
if (!html.includes(ccReturn)) {
  if (!html.includes(oldReturn)) throw new Error('Could not locate ambassador approval email mailto builder.');
  html = html.replace(oldReturn, ccReturn);
}

const widgetPattern = /      const ApprovalEmailControl = createClass\(\{[\s\S]*?      \}\);\n\n      CMS\.registerWidget\('referral-link'/;
if (!widgetPattern.test(html)) {
  throw new Error('Could not locate the Ambassador Approval Email widget for Zoho integration.');
}

const replacement = `      const AMBASSADOR_MAIL_ENDPOINT = '/api/admin/send-ambassador-approval';
      const AMBASSADOR_MAIL_FROM = '${fromEmail}';
      const AMBASSADOR_MAIL_CC = '${ccEmail}';
      const AMBASSADOR_MAIL_TOKEN_KEY = 'divine_ambassador_mail_github_token';
      const NETLIFY_AUTH_ORIGIN = 'https://api.netlify.com';

      const parseApprovalEmail = (value) => {
        try {
          const target = new URL(String(value || ''));
          if (target.protocol !== 'mailto:') return null;
          const email = decodeURIComponent(target.pathname || '').trim().toLowerCase();
          const body = String(target.searchParams.get('body') || '');
          const referralLink = body
            .split(/\\r?\\n/)
            .map((line) => line.trim())
            .find((line) => /^https:\\/\\/divineblueprint\\.gleaningground\\.com\\/\\?ref=AMB-/i.test(line)) || '';
          if (!email || !referralLink) return null;
          return { email, referralLink };
        } catch {
          return null;
        }
      };

      const clearAmbassadorMailToken = () => {
        try { sessionStorage.removeItem(AMBASSADOR_MAIL_TOKEN_KEY); } catch {}
      };

      const authorizeAmbassadorMail = ({ force = false } = {}) => {
        if (!force) {
          try {
            const cached = sessionStorage.getItem(AMBASSADOR_MAIL_TOKEN_KEY);
            if (cached) return Promise.resolve(cached);
          } catch {}
        }

        clearAmbassadorMailToken();
        return new Promise((resolve, reject) => {
          const authUrl = NETLIFY_AUTH_ORIGIN + '/auth?provider=github&site_id=' + encodeURIComponent('gleaningground.com') + '&scope=repo';
          const popup = window.open(authUrl, 'ambassador-mail-github-auth', 'width=720,height=760,resizable=yes,scrollbars=yes');
          if (!popup) {
            reject(new Error('Please allow the GitHub authorization pop-up and try again.'));
            return;
          }

          let settled = false;
          const finish = (error, token) => {
            if (settled) return;
            settled = true;
            window.removeEventListener('message', onMessage);
            window.clearTimeout(timeout);
            try { if (!popup.closed) popup.close(); } catch {}
            if (error) reject(error);
            else resolve(token);
          };

          const onMessage = (event) => {
            if (event.origin !== NETLIFY_AUTH_ORIGIN || typeof event.data !== 'string') return;
            const message = event.data;
            if (message === 'authorizing:github') {
              try { event.source?.postMessage('authorizing:github', NETLIFY_AUTH_ORIGIN); } catch {}
              return;
            }

            const successPrefix = 'authorization:github:success:';
            if (message.startsWith(successPrefix)) {
              try {
                const payload = JSON.parse(message.slice(successPrefix.length));
                const token = String(payload?.token || payload?.access_token || '').trim();
                if (!token) throw new Error('GitHub authorization did not return an access token.');
                try { sessionStorage.setItem(AMBASSADOR_MAIL_TOKEN_KEY, token); } catch {}
                finish(null, token);
              } catch (error) {
                finish(error);
              }
              return;
            }

            const errorPrefix = 'authorization:github:error:';
            if (message.startsWith(errorPrefix)) {
              finish(new Error('GitHub authorization was not completed.'));
            }
          };

          window.addEventListener('message', onMessage);
          const timeout = window.setTimeout(() => finish(new Error('GitHub authorization timed out. Please try again.')), 90000);
        });
      };

      const sendAmbassadorApproval = async (data, token) => fetch(AMBASSADOR_MAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + token
        },
        body: JSON.stringify(data)
      });

      const ApprovalEmailControl = createClass({
        getInitialState: function() { return { sending: false, status: '' }; },
        send: async function(event) {
          event.preventDefault();
          if (this.state.sending) return;
          const data = parseApprovalEmail(this.props.value);
          if (!data) return;

          const confirmed = window.confirm(
            'Send the Divine Blueprint Ambassador approval email to ' + data.email + '?\\n\\n' +
            'From: ' + AMBASSADOR_MAIL_FROM + '\\n' +
            'CC: ' + AMBASSADOR_MAIL_CC
          );
          if (!confirmed) return;

          this.setState({ sending: true, status: 'Authorizing and sending…' });
          try {
            let token = await authorizeAmbassadorMail();
            let response = await sendAmbassadorApproval(data, token);

            if (response.status === 401) {
              clearAmbassadorMailToken();
              token = await authorizeAmbassadorMail({ force: true });
              response = await sendAmbassadorApproval(data, token);
            }

            let result = {};
            try { result = await response.json(); } catch {}

            if (!response.ok) {
              if (result?.error === 'MAIL_NOT_CONFIGURED') {
                throw new Error('Zoho Mail is connected in the website code but its SMTP app password has not yet been added to Netlify.');
              }
              if (result?.error === 'ADMIN_REQUIRED') {
                throw new Error('This Zoho send action is restricted to the authorized Gleaning Ground administrator.');
              }
              if (result?.error === 'RECENTLY_SENT') {
                throw new Error('An approval email was sent to this ambassador very recently. Please wait before sending again.');
              }
              throw new Error('The approval email could not be sent through Zoho.');
            }

            this.setState({
              sending: false,
              status: 'Sent successfully from ' + AMBASSADOR_MAIL_FROM + ' and copied to ' + AMBASSADOR_MAIL_CC + '.'
            });
          } catch (error) {
            console.error('Ambassador approval email failed', error);
            this.setState({ sending: false, status: String(error?.message || error) });
          }
        },
        render: function() {
          const data = parseApprovalEmail(this.props.value);
          const ready = Boolean(data);
          return h('div', { className: 'ambassador-approval-email-widget' },
            h('button', {
              type: 'button',
              onClick: this.send,
              disabled: !ready || this.state.sending,
              className: 'ambassador-approval-email-button'
            }, this.state.sending ? 'Sending…' : 'Send approval email via Zoho'),
            h('span', { className: 'ambassador-approval-email-note', 'aria-live': 'polite' },
              this.state.status || (ready
                ? 'Sends from ${fromEmail}, automatically CCs ${ccEmail}, and asks for confirmation before sending.'
                : 'Save/publish this active ambassador first, then reopen the entry to enable Zoho sending.')
            )
          );
        }
      });

      CMS.registerWidget('referral-link'`;

html = html.replace(widgetPattern, replacement);

for (const required of [
  'Send approval email via Zoho',
  AMBASSADOR_SENTINEL(),
  `AMBASSADOR_MAIL_FROM = '${fromEmail}'`,
  `AMBASSADOR_MAIL_CC = '${ccEmail}'`,
  "authorization:github:success:",
  "'/api/admin/send-ambassador-approval'"
]) {
  if (!html.includes(required)) throw new Error(`Zoho Ambassador email integration is missing: ${required}`);
}

await writeFile(indexPath, html, 'utf8');
console.log('Connected Ambassador Management approval emails to the secure Zoho/Netlify sender.');

function AMBASSADOR_SENTINEL() {
  return "CMS.registerWidget('approval-email'";
}
