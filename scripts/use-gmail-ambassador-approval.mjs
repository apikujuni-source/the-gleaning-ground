import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
const gmailAddress = 'apikujuni@gmail.com';
const siteId = '16d8529d-ae7b-4a0b-a0d9-7f9923ebc7a1';
const endpoint = '/api/admin/send-ambassador-gmail';
let html = await readFile(indexPath, 'utf8');

const widgetPattern = /      const ApprovalEmailControl = createClass\(\{[\s\S]*?      \}\);\n\n      CMS\.registerWidget\('referral-link'/;
if (!widgetPattern.test(html)) {
  throw new Error('Could not locate the generated Ambassador Approval Email widget.');
}

const replacement = `      const GMAIL_SENDER = '${gmailAddress}';
      const GMAIL_SEND_ENDPOINT = '${endpoint}';
      const GMAIL_AUTH_SITE_ID = '${siteId}';
      const GMAIL_AUTH_TOKEN_KEY = 'divine_ambassador_gmail_github_token';
      const NETLIFY_AUTH_ORIGIN = 'https://api.netlify.com';

      const getAmbassadorEntrySlug = () => {
        const match = String(window.location.hash || '').match(/#\\/collections\\/ambassador_management\\/entries\\/([^/?#]+)/i);
        if (!match) return '';
        try {
          const slug = decodeURIComponent(match[1]).trim().toLowerCase();
          return /^[a-z0-9][a-z0-9-]{0,119}$/.test(slug) ? slug : '';
        } catch {
          return '';
        }
      };

      const clearGmailSendToken = () => {
        try { sessionStorage.removeItem(GMAIL_AUTH_TOKEN_KEY); } catch {}
      };

      const authorizeGmailSend = ({ force = false } = {}) => {
        if (!force) {
          try {
            const cached = sessionStorage.getItem(GMAIL_AUTH_TOKEN_KEY);
            if (cached) return Promise.resolve(cached);
          } catch {}
        }

        clearGmailSendToken();
        return new Promise((resolve, reject) => {
          const authUrl = NETLIFY_AUTH_ORIGIN + '/auth?provider=github&site_id=' + encodeURIComponent(GMAIL_AUTH_SITE_ID) + '&scope=repo';
          const popup = window.open(authUrl, 'ambassador-gmail-github-auth', 'width=720,height=760,resizable=yes,scrollbars=yes');
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
                try { sessionStorage.setItem(GMAIL_AUTH_TOKEN_KEY, token); } catch {}
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

      const callGmailSender = (data, token) => fetch(GMAIL_SEND_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + token
        },
        body: JSON.stringify(data)
      });

      const describeGmailSendError = (result) => {
        if (result?.error === 'MAIL_NOT_CONFIGURED') return 'Website sending is ready, but the Gmail app password has not been added to Netlify yet.';
        if (result?.error === 'ADMIN_REQUIRED') return 'This send action is restricted to the authorized Gleaning Ground administrator.';
        if (result?.error === 'AMBASSADOR_NOT_PUBLISHED') return 'This ambassador has not been published yet. Publish the entry, then reopen it.';
        if (result?.error === 'AMBASSADOR_NOT_ACTIVE') return 'This ambassador is not marked Active. Change the status to Active and publish before sending.';
        if (result?.error === 'AMBASSADOR_RECORD_INVALID') return 'The published ambassador entry is missing a valid email address or referral link.';
        if (result?.error === 'MAIL_SEND_FAILED') return 'Gmail could not send the approval email. Check the Gmail app password and account security settings.';
        return 'The approval email could not be prepared or sent.';
      };

      const ApprovalEmailControl = createClass({
        getInitialState: function() { return { working: false, status: '' }; },
        sendFromWebsite: async function(event) {
          event.preventDefault();
          if (this.state.working) return;
          const slug = getAmbassadorEntrySlug();
          if (!slug) return;

          this.setState({ working: true, status: 'Checking ambassador details…' });
          try {
            let token = await authorizeGmailSend();
            let previewResponse = await callGmailSender({ slug, preview: true }, token);

            if (previewResponse.status === 401) {
              clearGmailSendToken();
              token = await authorizeGmailSend({ force: true });
              previewResponse = await callGmailSender({ slug, preview: true }, token);
            }

            let preview = {};
            try { preview = await previewResponse.json(); } catch {}
            if (!previewResponse.ok) throw new Error(describeGmailSendError(preview));

            const confirmed = window.confirm(
              'Send the Divine Blueprint Ambassador approval email now?\\n\\n' +
              'From: ' + preview.from + '\\n' +
              'To: ' + preview.to + '\\n\\n' +
              'Referral link: ' + preview.referralLink
            );
            if (!confirmed) {
              this.setState({ working: false, status: 'Email not sent.' });
              return;
            }

            this.setState({ working: true, status: 'Sending from the website…' });
            let response = await callGmailSender({ slug }, token);
            if (response.status === 401) {
              clearGmailSendToken();
              token = await authorizeGmailSend({ force: true });
              response = await callGmailSender({ slug }, token);
            }

            let result = {};
            try { result = await response.json(); } catch {}
            if (!response.ok) throw new Error(describeGmailSendError(result));

            this.setState({
              working: false,
              status: 'Sent successfully from ' + GMAIL_SENDER + '.'
            });
          } catch (error) {
            console.error('Ambassador website Gmail send failed', error);
            this.setState({ working: false, status: String(error?.message || error) });
          }
        },
        render: function() {
          const ready = Boolean(getAmbassadorEntrySlug());
          return h('div', { className: 'ambassador-approval-email-widget' },
            h('button', {
              type: 'button',
              onClick: this.sendFromWebsite,
              disabled: !ready || this.state.working,
              className: 'ambassador-approval-email-button'
            }, this.state.working ? 'Working…' : 'Send approval email'),
            h('span', { className: 'ambassador-approval-email-note', 'aria-live': 'polite' },
              this.state.status || (ready
                ? 'Sends directly from this website using ${gmailAddress}. You will confirm the recipient before sending.'
                : 'Open a saved Ambassador Management entry to send the approval email.')
            )
          );
        }
      });

      CMS.registerWidget('referral-link'`;

html = html.replace(widgetPattern, replacement);

for (const required of [
  `GMAIL_SENDER = '${gmailAddress}'`,
  `GMAIL_SEND_ENDPOINT = '${endpoint}'`,
  `GMAIL_AUTH_SITE_ID = '${siteId}'`,
  'Send approval email',
  'Sending from the website…',
  'authorization:github:success:'
]) {
  if (!html.includes(required)) throw new Error(`Website Gmail integration is missing: ${required}`);
}

await writeFile(indexPath, html, 'utf8');
console.log(`Configured Ambassador Management to send approval emails directly from the website using ${gmailAddress}.`);
