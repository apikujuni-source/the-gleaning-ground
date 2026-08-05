import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const homePath = path.join(siteDir, 'index.html');
const cssPath = path.join(siteDir, 'assets', 'styles.css');
const MARKER = 'data-church-partner-program';

if (!fs.existsSync(homePath)) {
  throw new Error(`Divine Blueprint home page not found at ${homePath}`);
}

const cleanUrl = (html) => html
  .replace(/(?:\.\.\/)+assets\//g, '/assets/')
  .replace(/(["'])assets\//g, '$1/assets/')
  .replace(/href=(["'])index\.html\1/g, 'href="/"')
  .replace(/href=(["'])(?:\.\.\/)+index\.html\1/g, 'href="/"')
  .replace(/href=(["'])(?:\.\.\/)+([a-z0-9-]+)\.html\1/gi, 'href="/$2"')
  .replace(/href=(["'])([a-z0-9-]+)\.html\1/gi, 'href="/$2"');

function addNavigationLink(html, current = false) {
  // Normalize any legacy or relative Church Partner Program links to the clean public route.
  html = html.replace(
    /href=(["'])(?:\/|(?:\.\.\/)*|\.\/)?church-partners(?:\.html)?(#[^"']*)?\1/gi,
    (_match, quote, hash = '') => `href=${quote}/church-partners${hash}${quote}`
  );

  const navPattern = /(<nav\b[^>]*class=["'][^"']*nav-links[^"']*["'][^>]*>)([\s\S]*?)(<\/nav>)/i;
  html = html.replace(navPattern, (_match, open, links, close) => {
    if (!/href=["']\/church-partners["']/i.test(links)) {
      const link = '<a href="/church-partners">Church Partners</a>';
      const aboutPattern = /(<a\b[^>]*>\s*About\s*<\/a>)/i;
      links = aboutPattern.test(links)
        ? links.replace(aboutPattern, `${link}\n$1`)
        : `${links}\n${link}`;
    }

    if (current) {
      links = links.replace(/\saria-current=["']page["']/gi, '');
      links = links.replace(
        /(<a\b[^>]*href=["']\/church-partners["'][^>]*)(>)/i,
        '$1 aria-current="page"$2'
      );
    }

    return `${open}${links}${close}`;
  });

  const connectPattern = /(<div[^>]*>\s*<h3>\s*Connect\s*<\/h3>)([\s\S]*?)(<\/div>)/i;
  html = html.replace(connectPattern, (_match, open, links, close) => {
    if (/href=["']\/church-partners["']/i.test(links)) {
      links = links.replace(
        /(<a\b)(?![^>]*data-church-partner-footer-link)([^>]*href=["']\/church-partners["'][^>]*>)/i,
        '$1 data-church-partner-footer-link$2'
      );
    } else {
      const partnerLink = '<a href="/church-partners" data-church-partner-footer-link>Church Partners</a>';
      const contactPattern = /(<a\b[^>]*>\s*Contact\s*<\/a>)/i;
      links = contactPattern.test(links)
        ? links.replace(contactPattern, `$1<br>${partnerLink}`)
        : `${links}<br>${partnerLink}`;
    }
    return `${open}${links}${close}`;
  });

  return html;
}

function patchHtmlFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const isPartnerPage = /church-partners(?:\/index)?\.html$/i.test(filePath);
  html = addNavigationLink(html, isPartnerPage);
  fs.writeFileSync(filePath, html);
}

const homepageInvite = `
<section class="section partner-invite" ${MARKER}>
  <div class="container partner-invite-grid">
    <div>
      <span class="section-kicker">For Churches and Ministry Groups</span>
      <h2>Lead Your Community Through The Divine Blueprint</h2>
      <p class="lead">Use the book, digital Companion Journal, chapter studies, and teaching resources as a shared discipleship journey for your congregation, small groups, leadership team, or ministry fellowship.</p>
      <a class="btn btn-primary" href="/church-partners">Explore the Church Partner Program →</a>
    </div>
    <div class="partner-summary-card">
      <span class="partner-card-label">A Flexible Ministry Pathway</span>
      <ul class="list-check">
        <li>Church-wide reading journeys</li>
        <li>Small-group discipleship series</li>
        <li>Leadership formation cohorts</li>
        <li>Book-order and delivery coordination</li>
        <li>Digital Companion Journal access with every copy</li>
      </ul>
    </div>
  </div>
</section>`;

let home = fs.readFileSync(homePath, 'utf8');
home = addNavigationLink(home);
if (!home.includes(MARKER) && !home.includes('Explore the Church Partner Program')) {
  home = home.replace(/\s*<\/main>/i, `${homepageInvite}\n</main>`);
}
fs.writeFileSync(homePath, home);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.html') && fullPath !== homePath) patchHtmlFile(fullPath);
  }
}
walk(siteDir);

home = fs.readFileSync(homePath, 'utf8');
const headerMatch = home.match(/<header\b[\s\S]*?<\/header>/i);
const footerIndex = home.search(/<footer\b/i);
if (!headerMatch || footerIndex < 0) {
  throw new Error('Could not extract the Divine Blueprint header and footer shell.');
}

let header = cleanUrl(addNavigationLink(headerMatch[0], true));
header = header.replace(/\saria-current=["']page["']/gi, '');
header = header.replace(/(<a\b[^>]*href=["']\/church-partners["'][^>]*)>/i, '$1 aria-current="page">');
let tail = cleanUrl(addNavigationLink(home.slice(footerIndex)));

const partnerMain = `<main id="main">
<section class="page-hero partner-hero blueprint-bg">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a> / Church Partner Program</div>
    <span class="section-kicker">The Divine Blueprint Church Partner Program</span>
    <h1>Equip Your Church for Intentional Spiritual Formation</h1>
    <p class="lead">Help your congregation move from reading to reflection, discipleship, and faithful practice through a shared journey built around <em>The Divine Blueprint</em>.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#partner-interest">Become a Church Partner →</a>
      <a class="btn btn-secondary" href="#program-overview">See How It Works</a>
    </div>
  </div>
</section>

<section class="section section-light" id="program-overview">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">More Than a Bulk Book Order</span>
      <h2>A Shared Discipleship Journey</h2>
      <p>The program is designed for churches, fellowships, campus ministries, leadership teams, and small groups that want a clear Scripture-centered framework for spiritual growth.</p>
    </div>
    <div class="grid partner-benefit-grid">
      <article class="resource-card"><div class="icon-ring">01</div><h3>A Common Framework</h3><p>Guide participants through the book’s nine progressive chapters—from identity and formation to maturity, fellowship, service, and manifestation.</p></article>
      <article class="resource-card"><div class="icon-ring">02</div><h3>Flexible Group Use</h3><p>Adapt the journey for a church-wide reading campaign, discipleship class, small-group series, leadership cohort, or ministry training experience.</p></article>
      <article class="resource-card"><div class="icon-ring">03</div><h3>Companion Resources</h3><p>Every copy of the book includes access to the digital Companion Journal. Chapter studies, reflection prompts, teachings, and related resources help participants go deeper.</p></article>
      <article class="resource-card"><div class="icon-ring">04</div><h3>Partner Coordination</h3><p>Receive help planning the format, timeline, book quantity, delivery needs, and the most suitable support options for your church or ministry group.</p></article>
    </div>
  </div>
</section>

<section class="section section-dark">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">Suggested Uses</span>
      <h2>One Resource, Several Ministry Pathways</h2>
    </div>
    <div class="grid pathway-grid">
      <article class="pathway-card"><span>Church-wide</span><h3>Congregational Journey</h3><p>Invite the wider church to read together while sermons, classes, or group conversations reinforce each stage of formation.</p></article>
      <article class="pathway-card"><span>Small groups</span><h3>Discipleship Series</h3><p>Use the chapter sequence, study questions, and journal reflections for structured weekly discussion and application.</p></article>
      <article class="pathway-card"><span>Leadership</span><h3>Leader Formation Cohort</h3><p>Create space for ministry leaders and emerging leaders to examine character, responsibility, surrender, fellowship, and service.</p></article>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">A Simple Partnership Process</span>
      <h2>From Interest to Launch</h2>
    </div>
    <div class="process-list">
      <article class="process-step"><span>1</span><div><h3>Tell Us About Your Church</h3><p>Share your ministry context, estimated number of participants, location, and the kind of journey you are considering.</p></div></article>
      <article class="process-step"><span>2</span><div><h3>Choose the Right Format</h3><p>We will help identify a practical pathway and discuss current book-order, delivery, resource, and support options.</p></div></article>
      <article class="process-step"><span>3</span><div><h3>Prepare Your Leaders</h3><p>Set a schedule, identify facilitators, and decide how the book, digital journal, chapter studies, and teaching resources will work together.</p></div></article>
      <article class="process-step"><span>4</span><div><h3>Launch the Journey</h3><p>Lead participants through a consistent rhythm of reading, reflection, prayer, discussion, practice, and spiritual growth.</p></div></article>
    </div>
  </div>
</section>

<section class="section section-light">
  <div class="container content-grid">
    <article class="prose partner-faq">
      <span class="section-kicker">Frequently Asked Questions</span>
      <h2>Before You Apply</h2>
      <h3>Who can become a partner?</h3>
      <p>Local churches, ministry fellowships, campus ministries, Christian leadership teams, discipleship groups, and other organized faith communities may express interest.</p>
      <h3>Does every participant need a copy of the book?</h3>
      <p>Individual copies are recommended so each participant can read, mark key passages, and follow the journey personally. Every copy includes access to the digital Companion Journal.</p>
      <h3>Is a printed Companion Journal available?</h3>
      <p>No. The Companion Journal is currently provided digitally; a printed edition is not currently available.</p>
      <h3>Are partner prices or discounts available?</h3>
      <p>Current options depend on quantity, destination, delivery, and the level of support requested. After receiving your interest form, we will discuss the most appropriate arrangement without locking your church into a commitment.</p>
      <h3>Can we request a teaching session or author conversation?</h3>
      <p>You may include that request in the form. Speaking, virtual sessions, and leader conversations are considered according to timing, location, format, and availability.</p>
    </article>
    <aside class="sidebar">
      <div class="side-card partner-side-card">
        <span class="section-kicker">The Goal</span>
        <h3>Read. Reflect. Pray. Practice. Become.</h3>
        <p>The program is not simply about finishing a book. It is about helping believers cooperate with God’s process of formation.</p>
      </div>
      <div class="side-card"><h3>Good Fit For</h3><div class="pill-list"><span class="pill">Church-wide studies</span><span class="pill">Small groups</span><span class="pill">Leadership cohorts</span><span class="pill">Campus fellowships</span><span class="pill">Discipleship classes</span></div></div>
    </aside>
  </div>
</section>

<section class="section partner-application" id="partner-interest">
  <div class="container partner-form-grid">
    <div>
      <span class="section-kicker">Express Interest</span>
      <h2>Start a Conversation About Your Church</h2>
      <p class="lead">Complete the form with the information you know today. It is an inquiry, not a binding order or commitment.</p>
      <ul class="list-check">
        <li>Discuss the best program format</li>
        <li>Plan book quantity and delivery</li>
        <li>Review available group resources</li>
        <li>Explore teaching or leader-support requests</li>
      </ul>
    </div>
    <form class="contact-form partner-form" name="church-partner-interest" method="POST" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="church-partner-interest">
      <p class="hidden-field"><label>Do not fill this out: <input name="bot-field"></label></p>
      <div class="form-row">
        <label>Church or ministry name<input name="church-name" type="text" required></label>
        <label>Church website <span>(optional)</span><input name="church-website" type="url" placeholder="https://"></label>
      </div>
      <div class="form-row">
        <label>Contact person<input name="contact-name" type="text" required></label>
        <label>Role or title<input name="role" type="text" required></label>
      </div>
      <div class="form-row">
        <label>Email address<input name="email" type="email" required></label>
        <label>Phone or WhatsApp <span>(optional)</span><input name="phone" type="tel"></label>
      </div>
      <div class="form-row">
        <label>City and country<input name="location" type="text" required></label>
        <label>Estimated participants<input name="participants" type="number" min="1" placeholder="e.g., 25"></label>
      </div>
      <label>How are you considering using the program?
        <select name="program-format" required>
          <option value="">Select one</option>
          <option>Church-wide reading journey</option>
          <option>Small-group discipleship series</option>
          <option>Leadership formation cohort</option>
          <option>Campus or ministry fellowship</option>
          <option>Still exploring</option>
        </select>
      </label>
      <label>What would you like help with? <span>(optional)</span><textarea name="message" rows="5" placeholder="Tell us about your goals, expected timing, book quantity, delivery location, or teaching support request."></textarea></label>
      <button class="btn btn-primary" type="submit">Submit Church Partner Interest →</button>
      <p class="form-note">Submitting this form begins a conversation. It does not create an order or partnership agreement.</p>
    </form>
  </div>
</section>
</main>`;

const partnerPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="The Divine Blueprint Church Partner Program helps churches and ministry groups use the book and digital companion resources as a structured discipleship journey.">
<title>Church Partner Program | The Divine Blueprint</title>
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header}
${partnerMain}
${tail}`;

const partnerDir = path.join(siteDir, 'church-partners');
fs.mkdirSync(partnerDir, { recursive: true });
fs.writeFileSync(path.join(partnerDir, 'index.html'), partnerPage);
fs.writeFileSync(path.join(siteDir, 'church-partners.html'), partnerPage);

const partnerCss = `

/* Church Partner Program — generated during production build */
.partner-invite{overflow:hidden;background:linear-gradient(135deg,#fffdf8 0%,#f1e5d2 100%)}
.partner-invite-grid,.partner-form-grid{position:relative;display:grid;grid-template-columns:1.05fr .95fr;gap:4rem;align-items:center}
.partner-summary-card{background:var(--navy);color:white;border:1px solid var(--gold);border-radius:16px;padding:2rem;box-shadow:var(--shadow)}
.partner-summary-card .list-check{margin-bottom:0}.partner-summary-card .list-check li::before{color:var(--gold-2)}
.partner-card-label{display:block;color:var(--gold-2);font-size:.78rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:.7rem}
.partner-hero{position:relative;overflow:hidden}.partner-hero .container{position:relative;max-width:1040px}.partner-hero h1{max-width:900px}
.partner-benefit-grid{grid-template-columns:repeat(4,1fr)}
.partner-benefit-grid .resource-card{display:flex;flex-direction:column}.partner-benefit-grid .icon-ring{margin:0 0 1rem;font-size:.95rem;font-weight:800}
.pathway-grid{grid-template-columns:repeat(3,1fr)}
.pathway-card{border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:1.8rem;background:rgba(255,255,255,.045)}
.pathway-card span{color:var(--gold-2);font-size:.78rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.pathway-card p{color:#d9e1eb}
.process-list{max-width:900px;margin-inline:auto;display:grid;gap:1rem}
.process-step{display:grid;grid-template-columns:64px 1fr;gap:1.3rem;padding:1.45rem;background:var(--paper);border:1px solid var(--line);border-radius:14px}
.process-step>span{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--navy);color:var(--gold-2);font-family:var(--serif);font-size:1.35rem;font-weight:700}.process-step h3{margin-bottom:.4rem}.process-step p{margin:0;color:var(--muted)}
.partner-faq h2{margin-top:.5rem}.partner-faq h3{font-size:1.25rem;margin-top:1.8rem;margin-bottom:.45rem}.partner-faq p{margin-top:0}
.partner-side-card{background:var(--navy);color:white;border-color:var(--gold)}.partner-side-card h3{color:white}.partner-side-card .section-kicker{color:var(--gold-2)}
.partner-application{background:linear-gradient(135deg,#f7f1e7 0%,#fffdf8 100%)}
.partner-form{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:2rem;box-shadow:var(--shadow)}
.partner-form label{display:grid;gap:.4rem;font-weight:700;color:var(--navy)}.partner-form label span{font-weight:400;color:var(--muted);font-size:.86rem}
.partner-form input,.partner-form textarea,.partner-form select{width:100%;padding:.9rem 1rem;border:1px solid var(--line);border-radius:8px;background:white;color:var(--ink)}
.partner-form input:focus,.partner-form textarea:focus,.partner-form select:focus{outline:3px solid rgba(189,138,53,.18);border-color:var(--gold)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.hidden-field{position:absolute;left:-9999px}.form-note{margin:0;color:var(--muted);font-size:.85rem}
@media (max-width:980px){.partner-invite-grid,.partner-form-grid{grid-template-columns:1fr}.partner-benefit-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){.partner-benefit-grid,.pathway-grid,.form-row{grid-template-columns:1fr}}
`;

if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  if (!css.includes('Church Partner Program — generated during production build')) {
    css += partnerCss;
    fs.writeFileSync(cssPath, css);
  }
}

const sitemapPath = path.join(siteDir, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  let sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const partnerUrl = 'https://divineblueprint.gleaningground.com/church-partners';
  if (!sitemap.includes(partnerUrl)) {
    sitemap = sitemap.replace(/\s*<\/urlset>/i, `\n  <url><loc>${partnerUrl}</loc></url>\n</urlset>`);
    fs.writeFileSync(sitemapPath, sitemap);
  }
}

console.log('Church Partner Program installed in the Divine Blueprint production build.');
