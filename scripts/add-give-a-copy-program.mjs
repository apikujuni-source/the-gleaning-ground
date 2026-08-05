import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const homePath = path.join(siteDir, 'index.html');
const cssPath = path.join(siteDir, 'assets', 'styles.css');
const sitemapPath = path.join(siteDir, 'sitemap.xml');
const route = '/give-a-copy';
const marker = 'data-give-a-copy-program';
const styleMarker = '/* Divine Blueprint Give a Copy Program */';

if (!fs.existsSync(homePath)) {
  throw new Error(`Divine Blueprint home page not found at ${homePath}`);
}

const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
const textOf = (anchor) => anchor.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hrefOf = (anchor) => anchor.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
const normalizedHref = (href) => {
  let value = String(href || '').trim().replace(/^https?:\/\/[^/]+/i, '');
  value = value.replace(/[?#].*$/, '').replace(/index\.html$/i, '').replace(/\.html$/i, '');
  value = value.replace(/\/+$/, '');
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value.replace(/^(?:\.\.\/|\.\/)+/, '')}`;
};
const isGiveAnchor = (anchor) => {
  const href = normalizedHref(hrefOf(anchor));
  const text = textOf(anchor);
  return href === route || /^(give a copy|sponsor copies)$/i.test(text);
};

function normalizeNav(html, current = false) {
  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i;
  return html.replace(navPattern, (_match, open, body, close) => {
    body = body.replace(anchorPattern, (anchor) => isGiveAnchor(anchor) ? '' : anchor);
    const link = `<a href="${route}"${current ? ' aria-current="page"' : ''}>Give a Copy</a>`;
    const churchPattern = /(<a\b[^>]*href=["']\/church-partners["'][^>]*>[\s\S]*?<\/a>)/i;
    const aboutPattern = /(<a\b[^>]*>\s*About\s*<\/a>)/i;

    if (churchPattern.test(body)) body = body.replace(churchPattern, `$1\n${link}`);
    else if (aboutPattern.test(body)) body = body.replace(aboutPattern, `$1\n${link}`);
    else body = `${body}\n${link}`;
    return `${open}${body}${close}`;
  });
}

function normalizeFooter(html) {
  const connectPattern = /(<div[^>]*>\s*<h3>\s*Connect\s*<\/h3>)([\s\S]*?)(<\/div>)/i;
  return html.replace(connectPattern, (_match, open, body, close) => {
    body = body
      .replace(/\s*<br\s*\/?>\s*(<a\b[^>]*>[\s\S]*?<\/a>)/gi, (match, anchor) => isGiveAnchor(anchor) ? '' : match)
      .replace(/(<a\b[^>]*>[\s\S]*?<\/a>)\s*<br\s*\/?>/gi, (match, anchor) => isGiveAnchor(anchor) ? '' : match)
      .replace(anchorPattern, (anchor) => isGiveAnchor(anchor) ? '' : anchor);

    const link = `<a href="${route}" data-give-a-copy-footer-link>Give a Copy</a>`;
    const churchPattern = /(<a\b[^>]*href=["']\/church-partners["'][^>]*>[\s\S]*?<\/a>)/i;
    const gleaningPattern = /(<a\b[^>]*>\s*Gleaning Ground\s*<\/a>)/i;

    if (churchPattern.test(body)) body = body.replace(churchPattern, `$1<br>${link}`);
    else if (gleaningPattern.test(body)) body = body.replace(gleaningPattern, `$1<br>${link}`);
    else body = `${body}<br>${link}`;
    return `${open}${body}${close}`;
  });
}

function patchShell(html, current = false) {
  return normalizeFooter(normalizeNav(html, current));
}

const homepageInvite = `
<section class="section give-copy-invite" ${marker}>
  <div class="container give-copy-invite-grid">
    <div>
      <span class="section-kicker">Sponsor a Copy. Extend the Journey.</span>
      <h2>Put <em>The Divine Blueprint</em> in Someone’s Hands</h2>
      <p class="lead">Help an individual, small group, church, school, prison ministry, mission, or rehabilitation program receive a Scripture-centered discipleship resource. Every sponsored copy includes access to the digital Companion Journal.</p>
      <a class="btn btn-primary" href="${route}">Give or Sponsor Copies →</a>
    </div>
    <div class="give-copy-summary-card">
      <span class="partner-card-label">Ways to Participate</span>
      <ul class="list-check">
        <li>Gift one copy to someone you know</li>
        <li>Sponsor a 10-copy small-group pack</li>
        <li>Support a 50-copy church or community group</li>
        <li>Fund a larger outreach distribution</li>
        <li>Nominate a ministry or community to receive copies</li>
      </ul>
    </div>
  </div>
</section>`;

let home = fs.readFileSync(homePath, 'utf8');
home = patchShell(home);
if (!home.includes(marker)) {
  home = home.replace(/\s*<\/main>/i, `${homepageInvite}\n</main>`);
}
fs.writeFileSync(homePath, home);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.html') && fullPath !== homePath) {
      const isCurrent = /(?:^|\/)give-a-copy(?:\/index)?\.html$/i.test(fullPath);
      fs.writeFileSync(fullPath, patchShell(fs.readFileSync(fullPath, 'utf8'), isCurrent));
    }
  }
}
walk(siteDir);

home = fs.readFileSync(homePath, 'utf8');
const headerMatch = home.match(/<header\b[\s\S]*?<\/header>/i);
const footerIndex = home.search(/<footer\b/i);
if (!headerMatch || footerIndex < 0) {
  throw new Error('Could not extract the Divine Blueprint page shell.');
}

let header = patchShell(headerMatch[0], true);
header = header.replace(/\saria-current=["']page["']/gi, '');
header = header.replace(/(<a\b[^>]*href=["']\/give-a-copy["'][^>]*)>/i, '$1 aria-current="page">');
const tail = patchShell(home.slice(footerIndex));

const main = `<main id="main">
<section class="page-hero give-copy-hero blueprint-bg">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a> / Give a Copy</div>
    <span class="section-kicker">A Divine Blueprint Outreach Initiative</span>
    <h1>Put <em>The Divine Blueprint</em> in Someone’s Hands</h1>
    <p class="lead">A book can become a doorway to identity, formation, maturity, and faithful service. Sponsor a copy—or a group of copies—for someone who may not otherwise receive this discipleship resource.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#sponsor-interest">Sponsor Copies →</a>
      <a class="btn btn-secondary" href="#how-it-works">See How It Works</a>
    </div>
  </div>
</section>

<section class="section section-light" id="why-give">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">More Than Giving a Book</span>
      <h2>Help Someone Begin a Spiritual Formation Journey</h2>
      <p><em>The Divine Blueprint</em> is designed to help readers understand God’s work of making, maturing, and manifesting His sons. Every copy includes access to the digital Companion Journal so the reader can reflect, pray, and apply each chapter.</p>
    </div>
    <div class="grid give-copy-benefit-grid">
      <article class="resource-card"><div class="icon-ring">01</div><h3>Gift an Individual</h3><p>Place a copy directly in the hands of a student, young believer, ministry leader, friend, family member, or someone beginning again.</p></article>
      <article class="resource-card"><div class="icon-ring">10</div><h3>Equip a Small Group</h3><p>Sponsor a ten-copy pack for a discipleship group, campus fellowship, leadership circle, or community Bible study.</p></article>
      <article class="resource-card"><div class="icon-ring">50</div><h3>Support a Community</h3><p>Help a church, school, prison ministry, mission, rehabilitation program, or outreach organization lead a shared journey.</p></article>
      <article class="resource-card"><div class="icon-ring">250+</div><h3>Fund Wider Outreach</h3><p>Coordinate a larger distribution campaign with controlled batch printing, recipient verification, delivery planning, and impact follow-up.</p></article>
    </div>
  </div>
</section>

<section class="section section-dark" id="how-it-works">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">Responsible Sponsorship and Distribution</span>
      <h2>How the Program Works</h2>
    </div>
    <div class="process-list">
      <article class="process-step"><span>1</span><div><h3>Choose How You Want to Help</h3><p>Gift a copy, sponsor a suggested pack, support a larger outreach, or nominate a verified ministry or community to receive books.</p></div></article>
      <article class="process-step"><span>2</span><div><h3>Tell Us About the Recipient</h3><p>Share the intended recipient, organization, location, estimated quantity, and the purpose of the distribution.</p></div></article>
      <article class="process-step"><span>3</span><div><h3>Confirm Printing and Delivery</h3><p>We will confirm current book costs, quantity, delivery requirements, timing, and the payment or deposit needed before production.</p></div></article>
      <article class="process-step"><span>4</span><div><h3>Place the Books in Their Hands</h3><p>Copies are printed or allocated in controlled batches and coordinated for delivery. Larger campaigns may include basic distribution and impact reporting.</p></div></article>
    </div>
  </div>
</section>

<section class="section section-light">
  <div class="container give-copy-options-grid">
    <div>
      <span class="section-kicker">Suggested Sponsorship Levels</span>
      <h2>Start With One Copy—or Reach a Whole Community</h2>
      <p>These quantities are planning guides rather than fixed-price packages. Final costs depend on printing, destination, delivery, and the support required.</p>
    </div>
    <div class="give-copy-levels">
      <article><strong>1 Copy</strong><span>A personal gift</span></article>
      <article><strong>10 Copies</strong><span>Small-group pack</span></article>
      <article><strong>50 Copies</strong><span>Church or community formation pack</span></article>
      <article><strong>250 Copies</strong><span>Congregational or outreach campaign</span></article>
      <article><strong>500–1,000+</strong><span>Ministry partnership distribution</span></article>
    </div>
  </div>
</section>

<section class="section" id="sponsor-interest">
  <div class="container partner-form-layout">
    <div>
      <span class="section-kicker">Begin the Conversation</span>
      <h2>Tell Us Whose Hands You Want to Reach</h2>
      <p>Submit the form below to sponsor copies or nominate a potential recipient group. This form starts the planning process; it does not create an immediate charge or guarantee distribution.</p>
      <div class="partner-note"><strong>Important:</strong> Large sponsorships are confirmed only after recipient needs, printing, payment or deposit, and delivery arrangements have been verified.</div>
    </div>
    <form class="partner-interest-form" name="divine-blueprint-copy-sponsorship" method="POST" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="divine-blueprint-copy-sponsorship">
      <p class="form-hidden"><label>Do not fill this out: <input name="bot-field"></label></p>
      <div class="form-grid">
        <label>Full name<input type="text" name="name" autocomplete="name" required></label>
        <label>Email address<input type="email" name="email" autocomplete="email" required></label>
        <label>Phone or WhatsApp<input type="tel" name="phone" autocomplete="tel"></label>
        <label>Organization or church<input type="text" name="organization" autocomplete="organization"></label>
        <label>How would you like to participate?
          <select name="participation" required>
            <option value="">Select one</option>
            <option>Gift an individual copy</option>
            <option>Sponsor 10 copies</option>
            <option>Sponsor 50 copies</option>
            <option>Sponsor 250 copies</option>
            <option>Sponsor 500–1,000+ copies</option>
            <option>Nominate a recipient group</option>
            <option>Discuss a custom quantity</option>
          </select>
        </label>
        <label>Recipient type
          <select name="recipient-type">
            <option value="">Select one</option>
            <option>Individual</option>
            <option>Church or fellowship</option>
            <option>School or campus ministry</option>
            <option>Prison or correctional ministry</option>
            <option>Mission or outreach organization</option>
            <option>Rehabilitation or recovery program</option>
            <option>Other community group</option>
          </select>
        </label>
        <label class="form-span">Recipient or distribution location<input type="text" name="location" placeholder="City, state/region, and country"></label>
        <label class="form-span">Tell us about the recipient and your goal<textarea name="message" rows="6" required placeholder="Who should receive the books, approximately how many copies are needed, and how will they be used?"></textarea></label>
      </div>
      <button class="btn btn-primary" type="submit">Submit Sponsorship Interest →</button>
    </form>
  </div>
</section>

<section class="section section-dark give-copy-closing">
  <div class="container">
    <span class="section-kicker">One Book. One Reader. One Journey at a Time.</span>
    <h2>Help the Message Travel Beyond the People Who Can Easily Buy It</h2>
    <p class="lead">Together, we can place thoughtful, Scripture-centered formation resources in the hands of people and communities ready to grow.</p>
    <a class="btn btn-primary" href="#sponsor-interest">Put a Copy in Someone’s Hands →</a>
  </div>
</section>
</main>`;

const title = 'Put The Divine Blueprint in Someone’s Hands | The Divine Blueprint';
const description = 'Sponsor or gift copies of The Divine Blueprint to individuals, churches, schools, prison ministries, missions, rehabilitation programs, and community groups.';
const documentHtml = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n<meta name="description" content="${description}">\n<link rel="canonical" href="https://divineblueprint.gleaningground.com${route}">\n<link rel="stylesheet" href="/assets/styles.css">\n</head>\n<body>\n${header}\n${main}\n${tail}`;

const pageDir = path.join(siteDir, 'give-a-copy');
fs.mkdirSync(pageDir, { recursive: true });
fs.writeFileSync(path.join(pageDir, 'index.html'), documentHtml);
fs.writeFileSync(path.join(siteDir, 'give-a-copy.html'), documentHtml);

const styles = `
${styleMarker}
.give-copy-invite{background:linear-gradient(135deg,rgba(239,233,217,.78),rgba(255,255,255,.96))}.give-copy-invite-grid,.give-copy-options-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:clamp(2rem,5vw,5rem);align-items:center}.give-copy-summary-card,.give-copy-levels{background:#fff;border:1px solid rgba(26,54,78,.14);border-radius:24px;padding:clamp(1.5rem,3vw,2.5rem);box-shadow:0 18px 45px rgba(20,42,60,.1)}.give-copy-benefit-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.give-copy-levels{display:grid;gap:.8rem}.give-copy-levels article{display:flex;justify-content:space-between;gap:1rem;padding:1rem 0;border-bottom:1px solid rgba(26,54,78,.12)}.give-copy-levels article:last-child{border-bottom:0}.give-copy-levels strong{color:var(--navy,#15334b);white-space:nowrap}.give-copy-levels span{text-align:right}.partner-interest-form select{width:100%;min-height:48px;border:1px solid rgba(26,54,78,.22);border-radius:10px;padding:.75rem;background:#fff;color:inherit;font:inherit}.form-hidden{position:absolute;left:-9999px}.give-copy-closing{text-align:center}.give-copy-closing .lead{max-width:760px;margin-left:auto;margin-right:auto}.give-copy-closing .btn{margin-top:1rem}@media(max-width:1050px){.give-copy-benefit-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.give-copy-invite-grid,.give-copy-options-grid,.give-copy-benefit-grid{grid-template-columns:1fr}.give-copy-levels article{align-items:flex-start;flex-direction:column}.give-copy-levels span{text-align:left}}
`;
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  if (!css.includes(styleMarker)) fs.appendFileSync(cssPath, styles);
}

if (fs.existsSync(sitemapPath)) {
  let sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const url = `https://divineblueprint.gleaningground.com${route}`;
  if (!sitemap.includes(url)) {
    sitemap = sitemap.replace(/\s*<\/urlset>/i, `\n  <url><loc>${url}</loc></url>\n</urlset>`);
    fs.writeFileSync(sitemapPath, sitemap);
  }
}

console.log('Divine Blueprint Give a Copy program installed.');
