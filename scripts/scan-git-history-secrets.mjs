import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'git',
  ['log', '--all', '-p', '--no-ext-diff', '--no-color', '--pretty=format:'],
  { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
);

if (result.error || result.status !== 0) {
  console.error('Could not scan Git history for secret patterns.');
  process.exit(2);
}

const history = result.stdout || '';
const patterns = [
  ['live API secret/restricted key', /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g],
  ['Stripe webhook signing secret', /\bwhsec_[A-Za-z0-9]{16,}\b/g],
  ['GitHub classic token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['private key material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g]
];

const findings = patterns
  .filter(([, pattern]) => pattern.test(history))
  .map(([label]) => label);

if (findings.length) {
  console.error(`Potential secret material found in Git history (${findings.join(', ')}).`);
  console.error('The matched values are intentionally not printed. Rotate affected credentials and scrub history before relying on repository privacy.');
  process.exit(1);
}

console.log('Git history secret scan passed: no configured high-risk secret patterns found.');
