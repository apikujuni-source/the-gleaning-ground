import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import YAML from 'yaml';

const configPath = '_site/admin/config.yml';
const indexPath = '_site/admin/index.html';
const collectionName = 'ambassador_management';
const marker = 'data-ambassador-management-admin="true"';

for (const file of [configPath, indexPath]) {
  if (!existsSync(file)) throw new Error(`Missing generated CMS file: ${file}`);
}

const config = YAML.parse(await readFile(configPath, 'utf8'));
if (!config || !Array.isArray(config.collections)) {
  throw new Error('Generated CMS config does not contain a collections array.');
}

const ambassadorCollection = {
  name: collectionName,
  label: '8. Ambassador Management',
  label_singular: 'Approved Ambassador',
  description: 'Create and manage approved Divine Blueprint ambassadors. A unique referral ID and referral link are generated automatically the first time you save each ambassador.',
  folder: 'content/divine-blueprint/approved-ambassadors',
  create: true,
  extension: 'json',
  format: 'json',
  identifier_field: 'ambassadorName',
  slug: '{{year}}-{{month}}-{{day}}-{{slug}}',
  summary: '{{ambassadorName}} — {{status}} — {{referralId}}',
  fields: [
    {
      label: 'Ambassador Name',
      name: 'ambassadorName',
      widget: 'string',
      hint: 'Enter the approved applicant’s full name.'
    },
    {
      label: 'Email Address',
      name: 'email',
      widget: 'string',
      hint: 'Use the same email address from the approved application when possible.'
    },
    {
      label: 'Phone / WhatsApp',
      name: 'phone',
      widget: 'string',
      required: false
    },
    {
      label: 'City / Country',
      name: 'location',
      widget: 'string',
      required: false
    },
    {
      label: 'Ambassador Status',
      name: 'status',
      widget: 'select',
      default: 'Active',
      options: ['Active', 'Paused', 'Ended']
    },
    {
      label: 'Approval Date',
      name: 'approvedDate',
      widget: 'datetime',
      date_format: 'YYYY-MM-DD',
      time_format: false,
      format: 'YYYY-MM-DD',
      required: false,
      hint: 'Optional. Record the date you approved this ambassador.'
    },
    {
      label: 'Standard Commission (%)',
      name: 'commissionRate',
      widget: 'number',
      value_type: 'int',
      min: 0,
      max: 100,
      default: 25,
      hint: 'The current standard Ambassador reward is 25%.'
    },
    {
      label: 'Referral ID',
      name: 'referralId',
      widget: 'string',
      required: false,
      hint: 'Generated automatically on the first save. Keep this ID unchanged after sharing the referral link.'
    },
    {
      label: 'Personal Referral Link',
      name: 'referralLink',
      widget: 'referral-link',
      required: false,
      hint: 'Generated automatically from the Referral ID. Reopen the entry after the first save to copy the link.'
    },
    {
      label: 'Approval Email',
      name: 'approvalEmail',
      widget: 'approval-email',
      required: false,
      hint: 'Generated automatically for active ambassadors. Save/publish first, then reopen the entry and click Send approval email. The message opens for review before you send it.'
    },
    {
      label: 'Internal Notes',
      name: 'notes',
      widget: 'text',
      required: false,
      hint: 'Optional private notes about approval, communication, campaigns, or payout arrangements.'
    }
  ]
};

config.collections = config.collections.filter((collection) => collection?.name !== collectionName);
const insertAfter = config.collections.findIndex((collection) => collection?.name === 'divine_purchase_settings');
if (insertAfter >= 0) config.collections.splice(insertAfter + 1, 0, ambassadorCollection);
else config.collections.unshift(ambassadorCollection);

await writeFile(configPath, YAML.stringify(config), 'utf8');

let html = await readFile(indexPath, 'utf8');
const inlineConfig = JSON.stringify(config).replaceAll('<', '\\u003c');
const initPattern = /init\(\{ config: .* \}\);/;
if (!initPattern.test(html)) {
  throw new Error('Could not locate the inline Decap CMS initialization config.');
}
html = html.replace(initPattern, `init({ config: ${inlineConfig} });`);

const adminRuntime = `
  <script ${marker}>
    (() => {
      const BASE_URL = 'https://divineblueprint.gleaningground.com/';
      const normalizeCode = (value) => {
        const cleaned = String(value || '').trim().toUpperCase();
        return /^AMB-[A-Z0-9_-]{2,60}$/.test(cleaned) ? cleaned : '';
      };
      const namePart = (value) => String(value || '')
        .normalize('NFKD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, 18) || 'AMBASSADOR';
      const shortHash = (value) => {
        let hash = 2166136261;
        const input = String(value || '');
        for (let i = 0; i < input.length; i += 1) {
          hash ^= input.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36).toUpperCase().padStart(5, '0').slice(-5);
      };
      const buildApprovalEmail = ({ email, referralLink, status }) => {
        if (status !== 'Active' || !email || !referralLink) return '';
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
        return 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      };

      const ReferralLinkControl = createClass({
        getInitialState: function() { return { copied: false }; },
        copy: async function(event) {
          event.preventDefault();
          const value = String(this.props.value || '');
          if (!value) return;
          try {
            await navigator.clipboard.writeText(value);
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 1600);
          } catch (error) {
            const helper = document.createElement('textarea');
            helper.value = value;
            helper.style.position = 'fixed';
            helper.style.opacity = '0';
            document.body.appendChild(helper);
            helper.select();
            document.execCommand('copy');
            helper.remove();
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 1600);
          }
        },
        render: function() {
          const value = String(this.props.value || '');
          return h('div', { className: 'ambassador-referral-widget' },
            h('input', {
              id: this.props.forID,
              className: this.props.classNameWrapper,
              type: 'text',
              readOnly: true,
              value: value,
              placeholder: 'Generated automatically after first save'
            }),
            h('button', {
              type: 'button',
              onClick: this.copy,
              disabled: !value,
              className: 'ambassador-copy-button'
            }, this.state.copied ? 'Copied!' : 'Copy referral link')
          );
        }
      });

      const ApprovalEmailControl = createClass({
        openEmail: function(event) {
          event.preventDefault();
          const value = String(this.props.value || '');
          if (!/^mailto:/i.test(value)) return;
          window.location.href = value;
        },
        render: function() {
          const value = String(this.props.value || '');
          const ready = /^mailto:/i.test(value);
          return h('div', { className: 'ambassador-approval-email-widget' },
            h('button', {
              type: 'button',
              onClick: this.openEmail,
              disabled: !ready,
              className: 'ambassador-approval-email-button'
            }, 'Send approval email'),
            h('span', { className: 'ambassador-approval-email-note' },
              ready
                ? 'Opens a pre-addressed approval email with the personal referral link included. Review it before sending.'
                : 'Save/publish this active ambassador first, then reopen the entry to enable the email button.'
            )
          );
        }
      });

      CMS.registerWidget('referral-link', ReferralLinkControl);
      CMS.registerWidget('approval-email', ApprovalEmailControl);
      CMS.registerEventListener({
        name: 'preSave',
        handler: ({ entry }) => {
          const data = entry?.get?.('data');
          if (!data || typeof data.get !== 'function') return;
          const ambassadorName = String(data.get('ambassadorName') || '').trim();
          const status = String(data.get('status') || '').trim();
          if (!ambassadorName || !status) return;

          const collection = entry.get?.('collection');
          const collectionName = typeof collection === 'string' ? collection : collection?.get?.('name');
          if (collectionName && collectionName !== '${collectionName}') return;

          const email = String(data.get('email') || '').trim().toLowerCase();
          const existing = normalizeCode(data.get('referralId'));
          const generated = 'AMB-' + namePart(ambassadorName) + '-' + shortHash(ambassadorName + '|' + email);
          const referralId = existing || generated;
          const referralLink = BASE_URL + '?ref=' + encodeURIComponent(referralId);
          const commission = Number(data.get('commissionRate'));
          const approvalEmail = buildApprovalEmail({ email, referralLink, status });

          return data
            .set('referralId', referralId)
            .set('referralLink', referralLink)
            .set('approvalEmail', approvalEmail)
            .set('commissionRate', Number.isFinite(commission) ? commission : 25);
        }
      });
    })();
  </script>`;

if (!html.includes(marker)) {
  html = html.replace(
    '<script>\n    (() => {\n      try {',
    `${adminRuntime}\n  <script>\n    (() => {\n      try {`
  );
}

if (!html.includes('Open Ambassador Management →')) {
  html = html.replace(
    '<li><strong>Generated Sections & Special Pages</strong> — Ambassador, Church Partner, Give a Copy, their homepage callouts, terms, and confirmation page.</li>',
    '<li><strong>Ambassador Management</strong> — add approved applicants, generate and copy personal referral links, prepare approval emails, track status, commission, and internal notes.</li>\n        <li><strong>Generated Sections & Special Pages</strong> — Ambassador, Church Partner, Give a Copy, their homepage callouts, terms, and confirmation page.</li>'
  );
  html = html.replace(
    '<p><a href="#/collections/divine_purchase_settings/entries/purchase">Open Book Sales & Pricing →</a></p>',
    '<p><a href="#/collections/divine_purchase_settings/entries/purchase">Open Book Sales & Pricing →</a></p>\n      <p><a href="#/collections/ambassador_management">Open Ambassador Management →</a></p>'
  );
}

if (!html.includes('.ambassador-copy-button')) {
  html = html.replace(
    '</style>',
    `.ambassador-referral-widget{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.55rem;align-items:center}\n    .ambassador-copy-button{border:0;border-radius:7px;padding:.7rem .9rem;background:#173b62;color:#fff;font-weight:700;cursor:pointer}\n    .ambassador-copy-button:disabled{opacity:.5;cursor:not-allowed}\n    @media(max-width:640px){.ambassador-referral-widget{grid-template-columns:1fr}}\n  </style>`
  );
}

if (!html.includes('.ambassador-approval-email-button')) {
  html = html.replace(
    '</style>',
    `.ambassador-approval-email-widget{display:flex;flex-wrap:wrap;gap:.7rem;align-items:center;padding:.25rem 0}\n    .ambassador-approval-email-button{border:0;border-radius:7px;padding:.75rem 1rem;background:#173b62;color:#fff;font-weight:700;cursor:pointer}\n    .ambassador-approval-email-button:disabled{opacity:.5;cursor:not-allowed}\n    .ambassador-approval-email-note{font-size:.9rem;line-height:1.45;max-width:620px;color:#53606d}\n  </style>`
  );
}

await writeFile(indexPath, html, 'utf8');

const checkConfig = YAML.parse(await readFile(configPath, 'utf8'));
const checkHtml = await readFile(indexPath, 'utf8');
const installed = checkConfig.collections.find((collection) => collection?.name === collectionName);
if (!installed) throw new Error('Ambassador Management collection was not installed.');
for (const required of ['ambassadorName', 'email', 'status', 'commissionRate', 'referralId', 'referralLink', 'approvalEmail']) {
  if (!installed.fields.some((field) => field?.name === required)) {
    throw new Error(`Ambassador Management is missing field: ${required}`);
  }
}
for (const required of [marker, "CMS.registerWidget('referral-link'", "CMS.registerWidget('approval-email'", "name: 'preSave'", 'Send approval email', 'Open Ambassador Management →']) {
  if (!checkHtml.includes(required)) throw new Error(`Ambassador Management admin runtime is missing: ${required}`);
}

console.log('Installed Ambassador Management with automatic unique referral IDs, copyable referral links, review-before-send approval emails, status tracking, and 25% commission defaults.');
