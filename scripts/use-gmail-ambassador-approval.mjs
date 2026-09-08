import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
const gmailAddress = 'apikujuni@gmail.com';
let html = await readFile(indexPath, 'utf8');

const widgetPattern = /      const ApprovalEmailControl = createClass\(\{[\s\S]*?      \}\);\n\n      CMS\.registerWidget\('referral-link'/;
if (!widgetPattern.test(html)) {
  throw new Error('Could not locate the generated Ambassador Approval Email widget.');
}

const replacement = `      const GMAIL_SENDER = '${gmailAddress}';
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

      const loadPublishedAmbassador = async (slug) => {
        const url = 'https://raw.githubusercontent.com/apikujuni-source/the-gleaning-ground/main/content/divine-blueprint/approved-ambassadors/' + encodeURIComponent(slug) + '.json';
        const response = await fetch(url, { cache: 'no-store' });
        if (response.status === 404) throw new Error('This ambassador has not been published yet. Publish the entry, then reopen it.');
        if (!response.ok) throw new Error('The published ambassador record could not be loaded.');
        const record = await response.json();
        const email = String(record?.email || '').trim().toLowerCase();
        const referralLink = String(record?.referralLink || '').trim();
        if (String(record?.status || '').trim() !== 'Active') throw new Error('This ambassador is not marked Active.');
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) throw new Error('The published ambassador entry is missing a valid email address.');
        if (!/^https:\\/\\/divineblueprint\\.gleaningground\\.com\\/\\?ref=AMB-[A-Z0-9_-]{2,60}$/i.test(referralLink)) throw new Error('The published ambassador entry is missing a valid referral link.');
        return { email, referralLink };
      };

      const buildGmailComposeUrl = ({ email, referralLink }) => {
        const subject = 'Welcome to the Divine Blueprint Ambassador Program';
        const body = [
          'Congratulations! Your application to become a Divine Blueprint Ambassador has been approved.',
          '',
          'We’re excited to have you join us in helping share the message of The Divine Blueprint.',
          '',
          'Your personal referral link:',
          referralLink,
          '',
          'Your Ambassador Toolkit will be sent to you shortly.',
          '',
          'Welcome to the Ambassador Program!'
        ].join('\\n');
        const params = new URLSearchParams({
          authuser: GMAIL_SENDER,
          view: 'cm',
          fs: '1',
          to: email,
          su: subject,
          body
        });
        return 'https://mail.google.com/mail/?' + params.toString();
      };

      const ApprovalEmailControl = createClass({
        getInitialState: function() { return { working: false, status: '' }; },
        openGmail: async function(event) {
          event.preventDefault();
          if (this.state.working) return;
          const slug = getAmbassadorEntrySlug();
          if (!slug) return;
          this.setState({ working: true, status: 'Preparing Gmail…' });
          try {
            const data = await loadPublishedAmbassador(slug);
            const confirmed = window.confirm(
              'Prepare the approval email for ' + data.email + '?\\n\\n' +
              'Sender: ' + GMAIL_SENDER + '\\n' +
              'Referral link: ' + data.referralLink
            );
            if (!confirmed) {
              this.setState({ working: false, status: 'Email not opened.' });
              return;
            }
            const gmailUrl = buildGmailComposeUrl(data);
            const popup = window.open(gmailUrl, '_blank', 'noopener');
            if (!popup) window.location.href = gmailUrl;
            this.setState({ working: false, status: 'Gmail compose opened. Review the message, then click Send.' });
          } catch (error) {
            console.error('Ambassador Gmail compose failed', error);
            this.setState({ working: false, status: String(error?.message || error) });
          }
        },
        render: function() {
          const ready = Boolean(getAmbassadorEntrySlug());
          return h('div', { className: 'ambassador-approval-email-widget' },
            h('button', {
              type: 'button',
              onClick: this.openGmail,
              disabled: !ready || this.state.working,
              className: 'ambassador-approval-email-button'
            }, this.state.working ? 'Preparing…' : 'Open approval email in Gmail'),
            h('span', { className: 'ambassador-approval-email-note', 'aria-live': 'polite' },
              this.state.status || (ready
                ? 'Opens a pre-filled Gmail compose window using ${gmailAddress}. Review it before sending.'
                : 'Open a saved Ambassador Management entry to prepare the approval email.')
            )
          );
        }
      });

      CMS.registerWidget('referral-link'`;

html = html.replace(widgetPattern, replacement);

for (const required of [
  "GMAIL_SENDER = '${gmailAddress}'",
  'Open approval email in Gmail',
  'raw.githubusercontent.com/apikujuni-source/the-gleaning-ground',
  'mail.google.com/mail/'
]) {
  if (!html.includes(required)) throw new Error(`Gmail Ambassador email integration is missing: ${required}`);
}

await writeFile(indexPath, html, 'utf8');
console.log('Configured Ambassador Management approval emails to open in Gmail from ${gmailAddress}.');
