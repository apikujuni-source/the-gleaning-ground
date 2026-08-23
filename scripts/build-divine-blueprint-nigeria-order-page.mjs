import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const config = JSON.parse(await readFile("content/divine-blueprint/purchase.json", "utf8"));
const orderRoot = join(siteRoot, "nigeria-order");
const thanksRoot = join(orderRoot, "thanks");

await mkdir(orderRoot, { recursive: true });
await mkdir(thanksRoot, { recursive: true });

const mode = String(config.mode || "standard").toLowerCase();
const isPreorder = mode === "preorder";
const currentPrice = String(config.paperbackPriceNigeria || "₦10,000");
const regularPrice = String(config.paperbackRegularPriceNigeria || "₦12,000");
const savings = String(config.paperbackSavingsNigeria || "");
const numericPrice = Number(currentPrice.replace(/[^0-9.]/g, "")) || 10000;
const whatsapp = String(config.whatsappPrimary || "").replace(/\D/g, "");
const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Hello, I need help with my Nigeria preorder for The Divine Blueprint paperback.")}` : "#";

const pageTitle = isPreorder ? "Preorder The Divine Blueprint in Nigeria" : "Order The Divine Blueprint in Nigeria";
const actionLabel = isPreorder ? "Reserve My Preorder" : "Submit My Order";
const eyebrow = isPreorder ? "Nigeria Paperback Preorder" : "Nigeria Paperback Order";
const statusCopy = isPreorder
  ? "Reserve your paperback copy at the current preorder price. Your order is confirmed after payment is received."
  : "Order your paperback copy directly from The Divine Blueprint Nigeria storefront. Your order is confirmed after payment is received.";

const commonHead = `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#102f5e">
<link rel="stylesheet" href="/assets/styles.css?v=20260814-text-flow-v4">
<style>
/* Divine Blueprint Nigeria Order Page */
:root{--order-navy:#102f5e;--order-heading:#173f6b;--order-gold:#b88727;--order-bronze:#7a4b25;--order-paper:#fffdf8;--order-ink:#342b27;--order-muted:#655d56}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#f7f1e6 0%,#fffdf9 34%,#f4eee4 100%);color:var(--order-ink);font-family:Georgia,"Times New Roman",serif}.order-shell{min-height:100vh}.order-nav{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:17px clamp(20px,5vw,68px);background:#102f5e;border-bottom:1px solid rgba(184,135,39,.35)}.order-brand{color:#fff4d6!important;text-decoration:none!important;font-family:"Cormorant Garamond",Georgia,serif;font-size:clamp(1.15rem,2.5vw,1.55rem);font-weight:700}.nav-links{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.nav-links a{color:#fff4d6!important;text-decoration:none!important;font-size:.88rem;font-weight:700}.order-hero{padding:clamp(42px,7vw,82px) 20px 28px;text-align:center;background:radial-gradient(circle at 50% -10%,rgba(184,135,39,.18),transparent 52%)}.order-eyebrow{display:inline-block;margin-bottom:12px;color:var(--order-bronze);font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.order-hero h1{max-width:900px;margin:0 auto 15px;color:var(--order-navy);font-family:"Cormorant Garamond",Georgia,serif;font-size:clamp(2.35rem,6vw,4.8rem);line-height:.98;font-weight:600}.order-hero p{max-width:720px;margin:0 auto;color:#594f47;font-size:clamp(1rem,2vw,1.16rem);line-height:1.7}.order-layout{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.35fr);gap:clamp(24px,4vw,46px);width:min(1120px,calc(100% - 32px));margin:16px auto 70px;align-items:start}.order-summary,.order-form-card{border:1px solid rgba(16,47,94,.12);border-radius:22px;background:rgba(255,253,248,.96);box-shadow:0 22px 60px rgba(31,39,48,.09)}.order-summary{position:sticky;top:22px;padding:clamp(22px,4vw,34px)}.order-book{display:grid;grid-template-columns:110px 1fr;gap:20px;align-items:start}.order-book img{width:110px;height:auto;border-radius:5px;box-shadow:0 12px 28px rgba(0,0,0,.17)}.order-summary h2,.order-form-card h2{margin:.1rem 0 .65rem;color:var(--order-heading);font-family:"Cormorant Garamond",Georgia,serif;font-size:clamp(1.7rem,3vw,2.35rem);line-height:1.05}.order-summary p{margin:.3rem 0;color:var(--order-muted);line-height:1.55}.order-price{margin:24px 0 10px;padding:18px;border-radius:14px;background:#f7efdf;border:1px solid rgba(184,135,39,.28)}.order-price-main{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.order-price strong{color:var(--order-navy);font-size:2rem}.order-price del{color:#8d4b43;font-size:1rem}.order-save{display:inline-block;margin-top:7px;padding:5px 8px;border-radius:7px;background:#e5f2e7;color:#285f3e;font-size:.78rem;font-weight:800}.order-includes{margin:20px 0 0;padding:0;list-style:none;display:grid;gap:10px}.order-includes li{padding-left:25px;position:relative;line-height:1.5;color:#514941}.order-includes li::before{content:"✓";position:absolute;left:0;color:var(--order-gold);font-weight:900}.order-form-card{padding:clamp(24px,5vw,42px)}.order-form-intro{margin:-.15rem 0 24px;color:var(--order-muted);line-height:1.65}.order-form{display:grid;gap:19px}.order-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.order-field{display:grid;gap:7px}.order-field label{color:#283d54;font-size:.91rem;font-weight:800}.order-field input,.order-field select,.order-field textarea{width:100%;min-height:48px;padding:12px 13px;border:1px solid #cfc7ba;border-radius:9px;background:#fff;color:#2e2a26;font:inherit;font-size:1rem;outline:none}.order-field textarea{min-height:104px;resize:vertical}.order-field input:focus,.order-field select:focus,.order-field textarea:focus{border-color:var(--order-gold);box-shadow:0 0 0 3px rgba(184,135,39,.12)}.order-total{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:17px 18px;border-radius:12px;background:#f1f4f7;color:#233d59}.order-total strong{font-size:1.35rem}.order-payment-note{padding:16px 17px;border-left:4px solid var(--order-gold);background:#fff8e8;color:#584b3b;line-height:1.55;font-size:.92rem}.order-submit{min-height:54px;border:0;border-radius:10px;background:var(--order-navy);color:#fff;padding:14px 18px;font:inherit;font-size:1rem;font-weight:800;cursor:pointer;box-shadow:0 12px 28px rgba(16,47,94,.18)}.order-submit:hover,.order-submit:focus-visible{background:#173f6b;transform:translateY(-1px)}.order-help{text-align:center;color:#68605a;font-size:.88rem;line-height:1.5}.order-help a{color:var(--order-navy)!important;font-weight:800}.order-footer{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;padding:28px clamp(20px,5vw,68px);background:#102f5e;color:#fff4d6;font-size:.88rem}.order-footer h3{margin:0 0 7px;color:#fff4d6;font-size:.9rem}.order-footer a{color:#fff4d6!important}.order-footer .footer-home{text-align:right}.order-thanks{width:min(760px,calc(100% - 32px));margin:clamp(70px,12vw,130px) auto;padding:clamp(30px,6vw,58px);border:1px solid rgba(16,47,94,.14);border-radius:24px;background:#fffdf8;box-shadow:0 25px 70px rgba(31,39,48,.11);text-align:center}.order-thanks h1{margin:.2rem 0 1rem;color:var(--order-navy);font-family:"Cormorant Garamond",Georgia,serif;font-size:clamp(2.3rem,6vw,4rem);line-height:1}.order-thanks p{color:#5e554d;line-height:1.7}.order-thanks>a{display:inline-flex;margin-top:14px;padding:12px 18px;border-radius:9px;background:var(--order-navy);color:#fff!important;text-decoration:none!important;font-weight:800}@media(max-width:820px){.order-layout{grid-template-columns:1fr}.order-summary{position:static}.order-book{grid-template-columns:92px 1fr}.order-book img{width:92px}.order-nav{align-items:flex-start;flex-direction:column}.order-footer{grid-template-columns:1fr}.order-footer .footer-home{text-align:left}}@media(max-width:560px){.nav-links{gap:11px}.order-grid{grid-template-columns:1fr}.order-total{align-items:flex-start;flex-direction:column;gap:4px}.order-summary,.order-form-card{border-radius:16px}.order-hero{padding-top:36px}}
</style>`;

const nav = `
  <header class="order-nav">
    <a class="order-brand" href="/">The Divine Blueprint</a>
    <nav class="nav-links" aria-label="Primary navigation">
      <a href="/">Home</a>
      <a href="/start-here">Start Here</a>
      <a href="/about">About</a>
    </nav>
  </header>`;

const footer = `
  <footer class="order-footer">
    <div>
      <h3>Connect</h3>
      <a href="https://gleaningground.com" target="_blank" rel="noopener noreferrer">Gleaning Ground</a>
    </div>
    <div class="footer-home">© The Gleaning Ground · <a href="/">The Divine Blueprint</a></div>
  </footer>`;

const indexHtml = `<!doctype html>
<html lang="en">
<head>
<title>${pageTitle} | The Divine Blueprint</title>
<meta name="description" content="Order The Divine Blueprint paperback directly in Nigeria. Secure your copy and provide delivery details through the official Divine Blueprint website.">
${commonHead}
</head>
<body>
<div class="order-shell">
${nav}
  <section class="order-hero">
    <span class="order-eyebrow">${eyebrow}</span>
    <h1>${pageTitle}</h1>
    <p>${statusCopy}</p>
  </section>

  <main class="order-layout">
    <aside class="order-summary" aria-label="Order summary">
      <div class="order-book">
        <img src="/assets/divine-blueprint-cover.webp" alt="The Divine Blueprint by Ayo-Paul Ikujuni book cover" width="512" height="768">
        <div><span class="order-eyebrow">Paperback</span><h2>The Divine Blueprint</h2><p>by Ayo-Paul Ikujuni</p></div>
      </div>
      <div class="order-price">
        <div class="order-price-main"><strong>${currentPrice}</strong>${isPreorder ? `<del>${regularPrice}</del>` : ""}</div>
        ${isPreorder && savings ? `<span class="order-save">${savings}</span>` : ""}
      </div>
      <ul class="order-includes">
        <li>Official Nigeria paperback edition</li>
        <li>Personal access to the digital Companion Journal included</li>
        <li>Local delivery details collected with your order</li>
        <li>Order support available through WhatsApp</li>
      </ul>
    </aside>

    <section class="order-form-card" aria-labelledby="order-form-title">
      <span class="order-eyebrow">Order Details</span>
      <h2 id="order-form-title">Tell us where to send your copy</h2>
      <p class="order-form-intro">Complete the details below to reserve your copy. We will use your information only to process this order, arrange payment, and coordinate delivery.</p>

      <form class="order-form" name="divine-blueprint-nigeria-order" method="POST" action="/nigeria-order/thanks/" data-netlify="true" netlify-honeypot="bot-field">
        <input type="hidden" name="form-name" value="divine-blueprint-nigeria-order">
        <input type="hidden" name="edition" value="Nigeria Paperback">
        <input type="hidden" name="unit-price" value="${currentPrice}">
        <input type="hidden" name="store-mode" value="${mode}">
        <p hidden><label>Do not fill this out: <input name="bot-field"></label></p>
        <div class="order-grid">
          <div class="order-field"><label for="full-name">Full name</label><input id="full-name" name="full-name" type="text" autocomplete="name" required></div>
          <div class="order-field"><label for="phone">Phone / WhatsApp</label><input id="phone" name="phone" type="tel" autocomplete="tel" required></div>
        </div>
        <div class="order-field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" required></div>
        <div class="order-grid">
          <div class="order-field"><label for="state">State</label><input id="state" name="state" type="text" autocomplete="address-level1" required></div>
          <div class="order-field"><label for="city">City / Town</label><input id="city" name="city" type="text" autocomplete="address-level2" required></div>
        </div>
        <div class="order-field"><label for="address">Delivery address</label><textarea id="address" name="delivery-address" autocomplete="street-address" required></textarea></div>
        <div class="order-grid">
          <div class="order-field"><label for="quantity">Quantity</label><select id="quantity" name="quantity" required><option value="1" selected>1 copy</option><option value="2">2 copies</option><option value="3">3 copies</option><option value="4">4 copies</option><option value="5">5 copies</option><option value="6">6 copies</option><option value="7">7 copies</option><option value="8">8 copies</option><option value="9">9 copies</option><option value="10">10 copies</option></select></div>
          <div class="order-field"><label for="delivery-note">Delivery note</label><input id="delivery-note" name="delivery-note" type="text" placeholder="Optional landmark or note"></div>
        </div>
        <div class="order-total" aria-live="polite"><span>Book subtotal</span><strong id="order-total">${currentPrice}</strong></div>
        <div class="order-payment-note" data-payment-status="processor-pending"><strong>Payment:</strong> No card or bank details are collected on this page. After you submit your order, secure payment instructions will be provided. Your copy is confirmed once payment is received. Delivery charges, where applicable, are handled separately based on destination.</div>
        <label style="display:flex;gap:10px;align-items:flex-start;line-height:1.5;font-size:.9rem;color:#514941"><input type="checkbox" name="order-confirmation" value="I confirm my order details are correct" required style="margin-top:4px"><span>I confirm that my order and delivery details are correct and understand that the order is finalized after payment.</span></label>
        <button class="order-submit" type="submit">${actionLabel}</button>
        <p class="order-help">Need help before ordering? <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>.</p>
      </form>
    </section>
  </main>
${footer}
</div>
<script>(()=>{const q=document.getElementById('quantity');const t=document.getElementById('order-total');const unit=${numericPrice};const f=v=>'₦'+Number(v).toLocaleString('en-NG');const u=()=>{t.textContent=f(unit*Number(q.value||1));};q.addEventListener('change',u);u();})();</script>
</body>
</html>`;

const thanksHtml = `<!doctype html>
<html lang="en">
<head>
<title>Order Details Received | The Divine Blueprint</title>
<meta name="description" content="Your Divine Blueprint Nigeria paperback order details have been received.">
${commonHead}
</head>
<body>
<div class="order-shell">
${nav}
  <main class="order-thanks">
    <span class="order-eyebrow">Order Details Received</span>
    <h1>Thank you.</h1>
    <p>Your Nigeria paperback order details have been received. We will use the contact information you provided to send the secure payment and delivery instructions.</p>
    <p><strong>Your copy is confirmed once payment is received.</strong></p>
    <a href="/">Return to The Divine Blueprint</a>
  </main>
${footer}
</div>
</body>
</html>`;

await writeFile(join(orderRoot, "index.html"), indexHtml, "utf8");
await writeFile(join(thanksRoot, "index.html"), thanksHtml, "utf8");
await writeFile(join(siteRoot, "nigeria-order-page-status.txt"), ["NIGERIA_ORDER_PAGE=ACTIVE","ORDER_PATH=/nigeria-order/","PRODUCT=PAPERBACK",`MODE=${mode}`,`PRICE=${currentPrice}`,"FORM_BACKEND=NETLIFY_FORMS","PAYMENT_PROCESSOR=PENDING"].join("\n") + "\n", "utf8");
console.log(`Built branded Nigeria ${isPreorder ? "preorder" : "order"} page at /nigeria-order/ with Netlify order capture.`);
