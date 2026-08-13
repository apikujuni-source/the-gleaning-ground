import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const homePath = path.join(siteDir, 'index.html');
const cssPath = path.join(siteDir, 'assets', 'styles.css');
const ambassadorDir = path.join(siteDir, 'ambassadors');
const termsDir = path.join(ambassadorDir, 'terms');
const thanksDir = path.join(ambassadorDir, 'thanks');
const HOME_MARKER = 'data-ambassador-program-home';
const STYLE_MARKER = '/* Divine Blueprint Ambassador Program */';

if (!fs.existsSync(homePath)) {
  throw new Error(`Divine Blueprint home page not found at ${homePath}`);
}
if (!fs.existsSync(cssPath)) {
  throw new Error(`Divine Blueprint stylesheet not found at ${cssPath}`);
}

const cleanUrl = (html) => html
  .replace(/(?:\.\.\/)+assets\//g, '/assets/')
  .replace(/(["'])assets\//g, '$1/assets/')
  .replace(/href=(["'])index\.html\1/g, 'href="/"')
  .replace(/href=(["'])(?:\.\.\/)+index\.html\1/g, 'href="/"')
  .replace(/href=(["'])(?:\.\.\/)+([a-z0-9-]+)\.html\1/gi, 'href="/$2"')
  .replace(/href=(["'])([a-z0-9-]+)\.html\1/gi, 'href="/$2"');

function addAmbassadorLinks(html, currentRoute = '') {
  html = html.replace(
    /href=(["'])(?:\/|(?:\.\.\/)*|\.\/)?ambassadors(?:\/index\.html|\.html)?(?:\/?)(#[^"']*)?\1/gi,
    (_match, quote, hash = '') => `href=${quote}/ambassadors${hash}${quote}`
  );

  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i;
  html = html.replace(navPattern, (_match, open, links, close) => {
    if (!/href=["']\/ambassadors["']/i.test(links)) {
      const ambassadorLink = '<a href="/ambassadors">Ambassadors</a>';
      const churchPartnerPattern = /(<a\b[^>]*href=["']\/church-partners["'][^>]*>[\s\S]*?<\/a>)/i;
      const giveCopyPattern = /(<a\b[^>]*href=["']\/give-a-copy["'][^>]*>[\s\S]*?<\/a>)/i;
      if (churchPartnerPattern.test(links)) {
        links = links.replace(churchPartnerPattern, `${ambassadorLink}\n$1`);
      } else if (giveCopyPattern.test(links)) {
        links = links.replace(giveCopyPattern, `${ambassadorLink}\n$1`);
      } else {
        links = `${links}\n${ambassadorLink}`;
      }
    }

    if (currentRoute === '/ambassadors') {
      links = links.replace(/\saria-current=["']page["']/gi, '');
      links = links.replace(
        /(<a\b[^>]*href=["']\/ambassadors["'][^>]*)(>)/i,
        '$1 aria-current="page"$2'
      );
    }
    return `${open}${links}${close}`;
  });

  const connectPattern = /(<div[^>]*>\s*<h3>\s*Connect\s*<\/h3>)([\s\S]*?)(<\/div>)/i;
  html = html.replace(connectPattern, (_match, open, links, close) => {
    if (!/href=["']\/ambassadors["']/i.test(links)) {
      const ambassadorLink = '<a href="/ambassadors" data-ambassador-footer-link>Ambassadors</a>';
      const partnerPattern = /(<a\b[^>]*href=["']\/church-partners["'][^>]*>[\s\S]*?<\/a>)/i;
      links = partnerPattern.test(links)
        ? links.replace(partnerPattern, `${ambassadorLink}<br>$1`)
        : `${links}<br>${ambassadorLink}`;
    }
    return `${open}${links}${close}`;
  });

  return html;
}

function walkHtml(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      callback && walkHtml(fullPath, callback);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) callback(fullPath);
  }
}

walkHtml(siteDir, (filePath) => {
  const before = fs.readFileSync(filePath, 'utf8');
  const current = /(?:^|\/)ambassadors(?:\/index)?\.html$/i.test(filePath) ? '/ambassadors' : '';
  const after = addAmbassadorLinks(before, current);
  if (after !== before) fs.writeFileSync(filePath, after);
});

const homepageInvite = `
<section class="section ambassador-invite" ${HOME_MARKER}>
  <div class="container ambassador-invite-grid">
    <div>
      <span class="section-kicker">Help Carry the Message Further</span>
      <h2>Become a Divine Blueprint Ambassador</h2>
      <p class="lead">Share a message you believe in, help others discover <em>The Divine Blueprint</em>, and earn 15% on qualifying purchases made through your personal referral link.</p>
      <a class="btn btn-primary" href="/ambassadors">Explore the Ambassador Program →</a>
    </div>
    <aside class="ambassador-commission-card" aria-label="Ambassador commission summary">
      <span class="ambassador-card-label">Standard Commission</span>
      <strong>15%</strong>
      <p>on qualifying sales attributed to your approved referral link.</p>
    </aside>
  </div>
</section>`;

let home = fs.readFileSync(homePath, 'utf8');
home = addAmbassadorLinks(home);
if (!home.includes(HOME_MARKER)) {
  home = home.replace(/\s*<\/main>/i, `${homepageInvite}\n</main>`);
}
fs.writeFileSync(homePath, home);

home = fs.readFileSync(homePath, 'utf8');
const headerMatch = home.match(/<header\b[\s\S]*?<\/header>/i);
const footerIndex = home.search(/<footer\b/i);
if (!headerMatch || headerMatch.index == null || footerIndex < 0) {
  throw new Error('Could not extract the Divine Blueprint page shell.');
}

const prefix = cleanUrl(home.slice(0, headerMatch.index));
let header = cleanUrl(addAmbassadorLinks(headerMatch[0], '/ambassadors'));
let tail = cleanUrl(addAmbassadorLinks(home.slice(footerIndex)));

const ambassadorMain = `<main id="main">
<section class="page-hero ambassador-hero blueprint-bg">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a> / Ambassadors</div>
    <span class="section-kicker">The Divine Blueprint Ambassador Program</span>
    <h1>Share the Message. Impact a Life. Earn as You Recommend.</h1>
    <p class="lead">Join readers, ministry leaders, Christian creators, and believers who want to help more people discover God’s design for spiritual growth and maturity.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#apply">Apply to Become an Ambassador →</a>
      <a class="btn btn-secondary" href="#how-it-works">See How It Works</a>
    </div>
  </div>
</section>

<section class="section section-light">
  <div class="container ambassador-intro-grid">
    <div>
      <span class="section-kicker">A Message Worth Sharing</span>
      <h2>More Than an Affiliate Link</h2>
      <p class="lead">The Divine Blueprint Ambassador Program is built for people who genuinely connect with the message of the book and want to recommend it authentically.</p>
      <p>You do not need thousands of followers or professional marketing experience. You need a willingness to communicate responsibly, share the book in your own voice, and help the right readers find it.</p>
    </div>
    <aside class="ambassador-commission-card ambassador-commission-card-large">
      <span class="ambassador-card-label">Standard Ambassador Commission</span>
      <strong>15%</strong>
      <p>Earn 15% on qualifying purchases made through your approved personal referral link.</p>
    </aside>
  </div>
</section>

<section class="section" id="how-it-works">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">Simple by Design</span>
      <h2>How the Program Works</h2>
    </div>
    <div class="grid ambassador-step-grid">
      <article class="resource-card"><div class="icon-ring">01</div><h3>Apply</h3><p>Tell us about yourself, your community, and why you would like to share <em>The Divine Blueprint</em>.</p></article>
      <article class="resource-card"><div class="icon-ring">02</div><h3>Get Approved</h3><p>Approved ambassadors receive onboarding information and instructions for accessing their personal referral link.</p></article>
      <article class="resource-card"><div class="icon-ring">03</div><h3>Get Equipped</h3><p>Use the Ambassador Media Kit with approved book images, captions, talking points, videos, and campaign resources.</p></article>
      <article class="resource-card"><div class="icon-ring">04</div><h3>Share & Earn</h3><p>Recommend the book authentically and earn 15% on qualifying sales attributed to your approved referral link.</p></article>
    </div>
  </div>
</section>

<section class="section section-dark">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">Who We Are Looking For</span>
      <h2>Influence Is More Than Audience Size</h2>
      <p>A trusted recommendation within a small community can be more meaningful than a large but disengaged following.</p>
    </div>
    <div class="grid pathway-grid">
      <article class="pathway-card"><span>Readers</span><h3>People Who Believe in the Message</h3><p>Readers who have engaged with the book and naturally want to recommend it to others.</p></article>
      <article class="pathway-card"><span>Ministry</span><h3>Pastors & Christian Leaders</h3><p>Pastors, Bible-study leaders, campus fellowship leaders, discipleship leaders, and ministry workers.</p></article>
      <article class="pathway-card"><span>Creators</span><h3>Christian Voices & Communities</h3><p>Content creators, podcasters, reviewers, bloggers, community administrators, and trusted online voices.</p></article>
    </div>
  </div>
</section>

<section class="section section-light">
  <div class="container content-grid">
    <article class="prose">
      <span class="section-kicker">What You Receive</span>
      <h2>Everything You Need to Share Well</h2>
      <ul class="list-check">
        <li>A personal referral link for approved products</li>
        <li>15% standard commission on qualifying sales</li>
        <li>Book mockups and approved promotional graphics</li>
        <li>Ready-to-use captions and WhatsApp copy</li>
        <li>Short video and Reel assets as available</li>
        <li>Book talking points and audience guidance</li>
        <li>Launch and campaign updates</li>
        <li>Access to new promotional resources as the program grows</li>
      </ul>
      <p><a href="/ambassadors/terms">Read the full Ambassador Program Terms →</a></p>
    </article>
    <aside class="sidebar">
      <div class="side-card">
        <span class="section-kicker">The Heart of the Program</span>
        <h3>Authenticity First. Promotion Second.</h3>
        <p>The strongest recommendation comes from genuine conviction, not pressure. Represent the book accurately, speak in your own voice, and share with people who may truly benefit from it.</p>
      </div>
      <div class="side-card">
        <h3>Good Fit For</h3>
        <div class="pill-list"><span class="pill">Readers</span><span class="pill">Pastors</span><span class="pill">Bible-study leaders</span><span class="pill">Christian creators</span><span class="pill">Campus leaders</span><span class="pill">Book reviewers</span></div>
      </div>
    </aside>
  </div>
</section>

<section class="section">
  <div class="container content-grid">
    <article class="prose ambassador-faq">
      <span class="section-kicker">Frequently Asked Questions</span>
      <h2>Before You Apply</h2>
      <h3>How much is the commission?</h3>
      <p>The standard commission is 15% on qualifying sales attributed to your approved referral link.</p>
      <h3>Do I need a large social-media following?</h3>
      <p>No. We value trust, relevance, and authentic recommendations more than follower count alone.</p>
      <h3>Do I have to be a pastor or Christian creator?</h3>
      <p>No. Readers and believers who genuinely connect with the message are welcome to apply.</p>
      <h3>How are sales tracked?</h3>
      <p>Approved ambassadors receive referral instructions through the affiliate platform used for eligible products. Qualifying purchases are attributed through that approved referral system.</p>
      <h3>Can I share copies of the digital book with people I refer?</h3>
      <p>No. Ambassador status does not authorize reproduction or distribution of the book or companion materials. Each reader should obtain their own authorized copy or access.</p>
    </article>
    <aside class="sidebar">
      <div class="side-card ambassador-side-cta">
        <span class="section-kicker">Ready?</span>
        <h3>Help Take the Message Further</h3>
        <p>Apply below. If approved, you will receive the next steps for onboarding and referral access.</p>
        <a class="btn btn-primary" href="#apply">Apply Now →</a>
      </div>
    </aside>
  </div>
</section>

<section class="section section-light ambassador-application" id="apply">
  <div class="container ambassador-form-grid">
    <div>
      <span class="section-kicker">Founding Ambassador Application</span>
      <h2>Tell Us About Yourself</h2>
      <p class="lead">We are beginning with a carefully selected group of ambassadors who genuinely connect with the message and can represent it responsibly.</p>
      <ul class="list-check">
        <li>No large following required</li>
        <li>15% standard commission</li>
        <li>Approved promotional resources</li>
        <li>Personal referral-link access after approval</li>
      </ul>
    </div>
    <form class="contact-form ambassador-form" name="divine-blueprint-ambassador-application" method="POST" action="/ambassadors/thanks" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="divine-blueprint-ambassador-application">
      <p class="hidden-field"><label>Do not fill this out: <input name="bot-field"></label></p>
      <div class="form-row">
        <label>Full name<input name="name" type="text" autocomplete="name" required></label>
        <label>Email address<input name="email" type="email" autocomplete="email" required></label>
      </div>
      <div class="form-row">
        <label>Phone or WhatsApp <span>(optional)</span><input name="phone" type="tel" autocomplete="tel"></label>
        <label>City and country<input name="location" type="text" required></label>
      </div>
      <div class="form-row">
        <label>Primary platform or community
          <select name="primary-platform" required>
            <option value="">Select one</option>
            <option>WhatsApp</option>
            <option>Instagram</option>
            <option>Facebook</option>
            <option>YouTube</option>
            <option>TikTok</option>
            <option>Email or newsletter</option>
            <option>Church or ministry community</option>
            <option>Campus fellowship</option>
            <option>Blog or website</option>
            <option>Other</option>
          </select>
        </label>
        <label>Approximate audience/community size
          <select name="audience-size" required>
            <option value="">Select one</option>
            <option>Under 100</option>
            <option>100–499</option>
            <option>500–1,999</option>
            <option>2,000–9,999</option>
            <option>10,000+</option>
          </select>
        </label>
      </div>
      <label>Church, ministry, organization, or platform name <span>(optional)</span><input name="organization" type="text"></label>
      <label>Have you read The Divine Blueprint?
        <select name="book-status" required>
          <option value="">Select one</option>
          <option>Yes</option>
          <option>I am currently reading it</option>
          <option>Not yet</option>
        </select>
      </label>
      <label>Why would you like to become a Divine Blueprint Ambassador?<textarea name="why" rows="5" required placeholder="Tell us why the message resonates with you and how you would naturally share it."></textarea></label>
      <label class="checkbox-label"><input type="checkbox" name="commission-understanding" required> <span>I understand that the standard ambassador commission is 15% on qualifying sales attributed through the approved referral system.</span></label>
      <label class="checkbox-label"><input type="checkbox" name="terms-agreement" required> <span>I have read and agree to the <a href="/ambassadors/terms" target="_blank" rel="noopener">Ambassador Program Terms</a>.</span></label>
      <button class="btn btn-primary" type="submit">Submit Ambassador Application →</button>
      <p class="form-note">Submitting this form is an application and does not guarantee acceptance into the Ambassador Program.</p>
    </form>
  </div>
</section>
</main>`;

const termsMain = `<main id="main">
<section class="page-hero blueprint-bg">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a> / <a href="/ambassadors">Ambassadors</a> / Terms</div>
    <span class="section-kicker">Divine Blueprint Ambassador Program</span>
    <h1>Ambassador Program Terms</h1>
    <p class="lead">These terms are designed to keep the program clear, fair, and aligned with the message and values of <em>The Divine Blueprint</em>.</p>
  </div>
</section>
<section class="section section-light">
  <div class="container ambassador-terms-wrap prose">
    <h2>1. Commission</h2><p>The standard ambassador commission is 15% of qualifying sales attributed through the approved referral system for eligible products, unless a specific campaign states otherwise.</p>
    <h2>2. Tracking and Attribution</h2><p>Ambassadors must use their assigned referral method when promoting eligible products. Sales attribution is determined by the records of the approved affiliate platform.</p>
    <h2>3. Completed Sales</h2><p>Commission applies only to valid completed transactions. Cancelled, fraudulent, disputed, reversed, or refunded transactions do not qualify.</p>
    <h2>4. Ethical Promotion</h2><p>Ambassadors must promote the book honestly and accurately. False claims, deceptive advertising, spam, impersonation, or misrepresentation are prohibited.</p>
    <h2>5. Claims About the Book</h2><p>Ambassadors must not claim that purchasing or reading the book guarantees wealth, healing, marriage, promotion, miracles, breakthrough, or any other outcome the book does not promise. The book should not be presented as a replacement for Scripture, the local church, pastoral guidance, or appropriate professional care.</p>
    <h2>6. Brand and Promotional Materials</h2><p>Official graphics, videos, excerpts, captions, and other materials supplied for ambassador use may be used to promote <em>The Divine Blueprint</em>. They must not be altered in a way that misrepresents the author, the book, The Gleaning Ground, or the program.</p>
    <h2>7. Intellectual Property and Distribution</h2><p>Participation does not transfer ownership of the book, companion resources, logos, graphics, videos, or other intellectual property. Ambassadors may not reproduce, upload, resell, share, or distribute unauthorized copies of the book or companion materials.</p>
    <h2>8. Paid Advertising</h2><p>Ambassadors who intend to run paid advertisements using the book title, author name, ministry name, or official branding should obtain approval before launching those advertisements.</p>
    <h2>9. Self-Referral</h2><p>The program is intended to reward genuine referrals to new customers and should not be used primarily as a personal discount mechanism.</p>
    <h2>10. Program Updates</h2><p>Eligible products, commission arrangements, campaign offers, and program terms may be updated when necessary. Material changes will be communicated to affected ambassadors when appropriate.</p>
    <h2>11. Removal from the Program</h2><p>The Gleaning Ground may remove an ambassador for fraud, abuse, misrepresentation, unauthorized distribution, unethical promotion, or conduct that materially harms the book, author, ministry, customers, or program.</p>
    <div class="ambassador-terms-cta"><a class="btn btn-primary" href="/ambassadors#apply">Return to the Application →</a></div>
  </div>
</section>
</main>`;

const thanksMain = `<main id="main">
<section class="page-hero blueprint-bg ambassador-thanks-hero">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a> / <a href="/ambassadors">Ambassadors</a> / Application Received</div>
    <span class="section-kicker">Application Received</span>
    <h1>Thank You for Applying</h1>
    <p class="lead">Your Divine Blueprint Ambassador application has been submitted. We will review the information you provided and contact you using the email address on your application if you are selected for the next stage.</p>
    <div class="hero-actions"><a class="btn btn-primary" href="/">Return Home →</a><a class="btn btn-secondary" href="/ambassadors">Back to Ambassadors</a></div>
  </div>
</section>
</main>`;

function pageHtml(main, currentRoute = '') {
  let pageHeader = header;
  if (currentRoute !== '/ambassadors') {
    pageHeader = pageHeader.replace(/\saria-current=["']page["']/gi, '');
  }
  return `${prefix}${pageHeader}${main}${tail}`;
}

fs.mkdirSync(ambassadorDir, { recursive: true });
fs.mkdirSync(termsDir, { recursive: true });
fs.mkdirSync(thanksDir, { recursive: true });
fs.writeFileSync(path.join(ambassadorDir, 'index.html'), pageHtml(ambassadorMain, '/ambassadors'));
fs.writeFileSync(path.join(termsDir, 'index.html'), pageHtml(termsMain));
fs.writeFileSync(path.join(thanksDir, 'index.html'), pageHtml(thanksMain));

let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes(STYLE_MARKER)) {
  css += `
${STYLE_MARKER}
.ambassador-invite{background:linear-gradient(135deg,rgba(17,39,56,.98),rgba(29,58,78,.96));color:#fff}.ambassador-invite-grid,.ambassador-intro-grid,.ambassador-form-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,.7fr);gap:clamp(2rem,5vw,4.5rem);align-items:center}.ambassador-invite .lead{color:rgba(255,255,255,.82)}.ambassador-commission-card{padding:2rem;border:1px solid rgba(189,138,53,.42);border-radius:20px;background:rgba(255,255,255,.08);box-shadow:0 20px 50px rgba(8,20,29,.18)}.ambassador-commission-card-large{background:var(--paper);border-color:var(--line);box-shadow:0 16px 38px rgba(15,35,52,.08)}.ambassador-card-label{display:block;margin-bottom:.45rem;font-size:.78rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--gold)}.ambassador-commission-card strong{display:block;font-family:var(--serif);font-size:clamp(3.75rem,8vw,6rem);line-height:.95;color:var(--gold)}.ambassador-commission-card p{margin:.8rem 0 0}.ambassador-step-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.ambassador-application{border-top:1px solid var(--line)}.ambassador-form-grid{align-items:start}.ambassador-form .checkbox-label{display:flex;align-items:flex-start;gap:.7rem}.ambassador-form .checkbox-label input{width:auto;margin-top:.32rem}.ambassador-form .checkbox-label span{font-weight:400}.ambassador-form .checkbox-label a{text-decoration:underline}.ambassador-terms-wrap{max-width:850px}.ambassador-terms-wrap h2{margin-top:2rem}.ambassador-terms-cta{margin-top:2.5rem}.ambassador-thanks-hero{min-height:64vh;display:flex;align-items:center}.ambassador-side-cta .btn{margin-top:.65rem}@media(max-width:980px){.ambassador-step-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.ambassador-invite-grid,.ambassador-intro-grid,.ambassador-form-grid{grid-template-columns:1fr}.ambassador-step-grid{grid-template-columns:1fr}.ambassador-commission-card{max-width:520px}.ambassador-commission-card strong{font-size:4.5rem}}
`;
  fs.writeFileSync(cssPath, css);
}

for (const filePath of [homePath, path.join(ambassadorDir, 'index.html'), path.join(termsDir, 'index.html'), path.join(thanksDir, 'index.html')]) {
  const html = fs.readFileSync(filePath, 'utf8');
  if (!/href=["']\/ambassadors["']/i.test(html)) throw new Error(`${filePath}: ambassador navigation link missing`);
}

const ambassadorHtml = fs.readFileSync(path.join(ambassadorDir, 'index.html'), 'utf8');
if (!ambassadorHtml.includes('name="divine-blueprint-ambassador-application"')) {
  throw new Error('Ambassador Netlify form was not created.');
}
if (!ambassadorHtml.includes('15%')) throw new Error('Ambassador commission copy is missing.');

console.log('Divine Blueprint Ambassador Program installed: landing page, terms, thank-you page, homepage invitation, navigation, footer link, and application form.');
