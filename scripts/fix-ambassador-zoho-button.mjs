import { readFile, writeFile } from 'node:fs/promises';

const indexPath = '_site/admin/index.html';
let html = await readFile(indexPath, 'utf8');

const widgetPattern = /      const ApprovalEmailControl = createClass\(\{[\s\S]*?      \}\);\n\n      CMS\.registerWidget\('referral-link'/;
if (!widgetPattern.test(html)) {
  throw new Error('Could not locate the generated Ambassador Approval Email widget.');
}

const replacement = `      const getAmbassadorEntrySlug = () => {
        const match = String(window.location.hash || '').match(/#\\/collections\\/ambassador_management\\/entries\\/([^/?#]+)/i);
        if (!match) return '';
        try {
          const slug = decodeURIComponent(match[1]).trim().toLowerCase();
          return /^[a-z0-9][a-z0-9-]{0,119}$/.test(slug) ? slug : '';
        } catch {
          return '';
        }
      };

      const describeAmbassadorMailError = (result) => {
        if (result?.error === 'MAIL_NOT_CONFIGURED') return 'Zoho Mail is connected, but its SMTP app password is not available to the Divine Blueprint Netlify function.';
        if (result?.error === 'ADMIN_REQUIRED') return 'This Zoho send action is restricted to the authorized Gleaning Ground administrator.';
        if (result?.error === 'AMBASSADOR_NOT_PUBLISHED') return 'This ambassador has not been published yet. Publish the entry, then reopen it and send the approval email.';
        if (result?.error === 'AMBASSADOR_NOT_ACTIVE') return 'This ambassador is not marked Active. Change the status to Active and publish before sending.';
        if (result?.error === 'AMBASSADOR_RECORD_INVALID') return 'The published ambassador entry is missing a valid email address or referral link.';
        if (result?.error === 'RECENTLY_SENT') return 'An approval email was sent to this ambassador very recently. Please wait before sending again.';
        return 'The approval email could not be prepared or sent through Zoho.';
      };

      const ApprovalEmailControl = createClass({
        getInitialState: function() { return { sending: false, status: '' }; },
        send: async function(event) {
          event.preventDefault();
          if (this.state.sending) return;
          const slug = getAmbassadorEntrySlug();
          if (!slug) return;

          this.setState({ sending: true, status: 'Checking the published ambassador record…' });
          try {
            let token = await authorizeAmbassadorMail();
            let previewResponse = await sendAmbassadorApproval({ slug, preview: true }, token);

            if (previewResponse.status === 401) {
              clearAmbassadorMailToken();
              token = await authorizeAmbassadorMail({ force: true });
              previewResponse = await sendAmbassadorApproval({ slug, preview: true }, token);
            }

            let preview = {};
            try { preview = await previewResponse.json(); } catch {}
            if (!previewResponse.ok) throw new Error(describeAmbassadorMailError(preview));

            const confirmed = window.confirm(
              'Send the Divine Blueprint Ambassador approval email to ' + preview.to + '?\\n\\n' +
              'From: ' + AMBASSADOR_MAIL_FROM + '\\n' +
              'CC: ' + AMBASSADOR_MAIL_CC + '\\n\\n' +
              'Referral link: ' + preview.referralLink
            );
            if (!confirmed) {
              this.setState({ sending: false, status: 'Email not sent.' });
              return;
            }

            this.setState({ sending: true, status: 'Sending through Zoho…' });
            let response = await sendAmbassadorApproval({ slug }, token);

            if (response.status === 401) {
              clearAmbassadorMailToken();
              token = await authorizeAmbassadorMail({ force: true });
              response = await sendAmbassadorApproval({ slug }, token);
            }

            let result = {};
            try { result = await response.json(); } catch {}
            if (!response.ok) throw new Error(describeAmbassadorMailError(result));

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
          const ready = Boolean(getAmbassadorEntrySlug());
          return h('div', { className: 'ambassador-approval-email-widget' },
            h('button', {
              type: 'button',
              onClick: this.send,
              disabled: !ready || this.state.sending,
              className: 'ambassador-approval-email-button'
            }, this.state.sending ? 'Working…' : 'Send approval email via Zoho'),
            h('span', { className: 'ambassador-approval-email-note', 'aria-live': 'polite' },
              this.state.status || (ready
                ? 'Uses the published ambassador email and referral link. Review the recipient before sending.'
                : 'Open a saved Ambassador Management entry to enable Zoho sending.')
            )
          );
        }
      });

      CMS.registerWidget('referral-link'`;

html = html.replace(widgetPattern, replacement);

for (const required of ['getAmbassadorEntrySlug', 'preview: true', 'describeAmbassadorMailError', 'Send approval email via Zoho']) {
  if (!html.includes(required)) throw new Error(`Ambassador Zoho button fix is missing: ${required}`);
}

await writeFile(indexPath, html, 'utf8');
console.log('Fixed Ambassador Management Zoho button to use the published ambassador entry instead of the missing approvalEmail field.');
