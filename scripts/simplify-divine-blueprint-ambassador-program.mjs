import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve('_site/divine-blueprint-site');
const ambassadorPath = path.join(siteDir, 'ambassadors', 'index.html');
const thanksPath = path.join(siteDir, 'ambassadors', 'thanks', 'index.html');

if (!fs.existsSync(ambassadorPath)) throw new Error(`Ambassador page not found: ${ambassadorPath}`);
if (!fs.existsSync(thanksPath)) throw new Error(`Ambassador thank-you page not found: ${thanksPath}`);

const replaceMain = (html, main) => {
  if (!/<main\b[\s\S]*?<\/main>/i.test(html)) throw new Error('Could not locate <main> on ambassador page.');
  return html.replace(/<main\b[\s\S]*?<\/main>/i, main);
};

const ambassadorMain = `<main id="main">
<section class="page-hero ambassador-hero blueprint-bg">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a> / Ambassadors</div>
    <span class="section-kicker">The Divine Blueprint Ambassador Program</span>
    <h1>Share the Message. Help It Reach Further.</h1>
    <p class="lead">Apply to become a Divine Blueprint Ambassador and help introduce the book to people who may benefit from its message of spiritual growth, formation, maturity, and faithful expression of Christ.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#apply">Apply to Become an Ambassador →</a>
      <a class="btn btn-secondary" href="#requirements">See Requirements & Benefits</a>
    </div>
  </div>
</section>

<section class="section section-light" id="requirements">
  <div class="container ambassador-intro-grid">
    <article class="prose">
      <span class="section-kicker">Who We Are Looking For</span>
      <h2>Ambassador Requirements</h2>
      <p>You do not need a huge following. We are looking for people who genuinely connect with the message and can share it responsibly within their sphere of influence.</p>
      <ul class="list-check">
        <li>A genuine interest in the message of <em>The Divine Blueprint</em></li>
        <li>A willingness to represent the book accurately and ethically</li>
        <li>An active community, platform, ministry network, church circle, fellowship, or personal audience</li>
        <li>A commitment not to use misleading claims, spam, or unauthorized copies of the book</li>
        <li>A willingness to use the approved referral link and promotional materials provided if selected</li>
      </ul>
      <p><strong>Reading the book is strongly preferred.</strong> Applicants who are currently reading it may also apply.</p>
    </article>
    <aside class="ambassador-commission-card ambassador-commission-card-large">
      <span class="ambassador-card-label">Standard Ambassador Commission</span>
      <strong>15%</strong>
      <p>Selected ambassadors earn 15% on qualifying purchases attributed to their approved referral link.</p>
    </aside>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">What Selected Ambassadors Receive</span>
      <h2>Program Benefits</h2>
    </div>
    <div class="grid ambassador-step-grid">
      <article class="resource-card"><div class="icon-ring">01</div><h3>15% Commission</h3><p>Earn 15% on qualifying purchases made through your approved personal referral link.</p></article>
      <article class="resource-card"><div class="icon-ring">02</div><h3>Personal Referral Link</h3><p>Selected ambassadors will be contacted directly and given instructions for their personal referral link.</p></article>
      <article class="resource-card"><div class="icon-ring">03</div><h3>Ambassador Toolkit</h3><p>Receive approved promotional materials such as book images, captions, talking points, WhatsApp copy, and campaign assets.</p></article>
      <article class="resource-card"><div class="icon-ring">04</div><h3>Campaign Support</h3><p>Receive selected launch updates, promotional ideas, and new resources as the Ambassador Program develops.</p></article>
    </div>
  </div>
</section>

<section class="section section-dark">
  <div class="container">
    <div class="section-head">
      <span class="section-kicker">Simple Selection Process</span>
      <h2>How It Works</h2>
    </div>
    <div class="process-list">
      <article class="process-step"><span>1</span><div><h3>Apply</h3><p>Complete the short application below and tell us about yourself, your community, and why you want to become an ambassador.</p></div></article>
      <article class="process-step"><span>2</span><div><h3>We Review Applications</h3><p>Applications are reviewed manually. Submitting an application does not automatically enroll you in the program.</p></div></article>
      <article class="process-step"><span>3</span><div><h3>Selected Applicants Are Contacted</h3><p>If selected, you will be contacted directly using the email address or contact information provided in your application.</p></div></article>
      <article class="process-step"><span>4</span><div><h3>Receive Your Link & Toolkit</h3><p>Selected ambassadors will receive referral-link instructions and the Divine Blueprint Ambassador Toolkit manually.</p></div></article>
    </div>
  </div>
</section>

<section class="section section-light">
  <div class="container content-grid">
    <article class="prose">
      <span class="section-kicker">Who Can Apply?</span>
      <h2>You May Be a Good Fit If You Are...</h2>
      <ul class="list-check">
        <li>A reader who has been helped or challenged by the book</li>
        <li>A pastor, ministry leader, Bible-study leader, or discipleship leader</li>
        <li>A Christian content creator, podcaster, blogger, reviewer, or community administrator</li>
        <li>A campus fellowship or young-adult leader</li>
        <li>A believer with a trusted WhatsApp, church, social-media, email, or personal network</li>
      </ul>
      <p>A large audience is not required. Relevance, trust, and authentic recommendation matter more than follower count.</p>
    </article>
    <aside class="sidebar">
      <div class="side-card">
        <span class="section-kicker">The Heart of the Program</span>
        <h3>Authenticity First.</h3>
        <p>We want ambassadors who can recommend the book naturally because they understand and value its message—not people who simply want another link to post.</p>
      </div>
    </aside>
  </div>
</section>

<section class="section ambassador-application" id="apply">
  <div class="container ambassador-form-grid">
    <div>
      <span class="section-kicker">Ambassador Application</span>
      <h2>Apply to Join</h2>
      <p class="lead">Complete the form below. We will review applications and contact selected applicants directly.</p>
      <ul class="list-check">
        <li>15% standard commission</li>
        <li>No large following required</li>
        <li>Selection is not automatic</li>
        <li>Referral link provided after selection</li>
        <li>Toolkit sent manually to selected ambassadors</li>
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
            <option>Personal network</option>
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
      <label class="checkbox-label"><input type="checkbox" name="program-understanding" required> <span>I understand that applications are reviewed, selection is not automatic, and selected ambassadors earn a standard 15% commission on qualifying sales attributed through their approved referral link.</span></label>
      <button class="btn btn-primary" type="submit">Submit Application →</button>
      <p class="form-note">If selected, you will be contacted directly with your referral-link instructions and Ambassador Toolkit.</p>
    </form>
  </div>
</section>
</main>`;

let ambassadorHtml = fs.readFileSync(ambassadorPath, 'utf8');
ambassadorHtml = replaceMain(ambassadorHtml, ambassadorMain);
fs.writeFileSync(ambassadorPath, ambassadorHtml);

const thanksMain = `<main id="main">
<section class="page-hero blueprint-bg ambassador-thanks-hero">
  <div class="container">
    <div class="breadcrumbs"><a href="/">Home</a> / <a href="/ambassadors">Ambassadors</a> / Application Received</div>
    <span class="section-kicker">Application Received</span>
    <h1>Thank You for Applying</h1>
    <p class="lead">Your Divine Blueprint Ambassador application has been received. Applications are reviewed manually, and selected applicants will be contacted directly with the next steps, referral-link instructions, and Ambassador Toolkit.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="/">Return Home →</a>
      <a class="btn btn-secondary" href="/ambassadors">Back to Ambassadors</a>
    </div>
  </div>
</section>
</main>`;

let thanksHtml = fs.readFileSync(thanksPath, 'utf8');
thanksHtml = replaceMain(thanksHtml, thanksMain);
fs.writeFileSync(thanksPath, thanksHtml);

const check = fs.readFileSync(ambassadorPath, 'utf8');
for (const required of ['Ambassador Requirements', 'Program Benefits', '15%', 'applications are reviewed', 'Toolkit sent manually']) {
  if (!check.toLowerCase().includes(required.toLowerCase())) {
    throw new Error(`Simplified ambassador page is missing required copy: ${required}`);
  }
}

console.log('Simplified Divine Blueprint Ambassador flow installed: requirements, benefits, application, manual selection, manual contact, and toolkit delivery.');
