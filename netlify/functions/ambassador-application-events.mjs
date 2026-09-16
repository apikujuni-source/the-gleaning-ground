import { createHash } from 'node:crypto';
import { getStore, getDeployStore } from '@netlify/blobs';

const FORM_SOURCE = 'Divine Blueprint Ambassador Program';
const STORE = 'ambassador-applications';

function clean(value, max = 1000) {
  return String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
}

function applicationFrom(data = {}) {
  const email = clean(data.email, 254).toLowerCase();
  if (!email || clean(data['application-source'], 120) !== FORM_SOURCE) return null;
  const fingerprint = JSON.stringify({
    email,
    phone: clean(data.phone, 80),
    why: clean(data.why, 2000),
    organization: clean(data.organization, 240)
  });
  const id = 'form-' + createHash('sha256').update(fingerprint + '|' + Date.now()).digest('hex').slice(0, 24);
  return {
    id,
    submittedAt: new Date().toISOString(),
    name: clean(data.name, 160),
    email,
    phone: clean(data.phone, 80),
    location: clean(data.location, 180),
    primaryPlatform: clean(data['primary-platform'], 120),
    audienceSize: clean(data['audience-size'], 120),
    organization: clean(data.organization, 240),
    bookStatus: clean(data['book-status'], 160),
    why: clean(data.why, 3000),
    programUnderstanding: String(data['program-understanding'] || '').toLowerCase() === 'on',
    status: 'pending'
  };
}

function applicationStore() {
  const production = Netlify.context?.deploy?.context === 'production';
  return production
    ? getStore(STORE, { consistency: 'strong' })
    : getDeployStore(STORE);
}

export default {
  async formSubmitted(event) {
    const application = applicationFrom(event?.data || {});
    if (!application) return;
    const store = applicationStore();
    await store.setJSON(`application/${application.id}.json`, application);
  }
};
