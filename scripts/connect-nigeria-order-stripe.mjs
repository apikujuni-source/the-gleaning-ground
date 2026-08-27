import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const siteRoot = '_site/divine-blueprint-site';
const pagePath = join(siteRoot, 'nigeria-order', 'index.html');
const thanksPath = join(siteRoot, 'nigeria-order', 'thanks', 'index.html');
const statusPath = join(siteRoot, 'nigeria-order-page-status.txt');
const config = JSON.parse(await readFile('content/divine-blueprint/purchase.json', 'utf8'));
const bookPrice = Number(String(config.paperbackPriceNigeria || '₦10,000').replace(/[^0-9.]/g, '')) || 10000;
const paymentUrl = String(config.stripeNigeriaPaymentUrl || '').trim();
const whatsapp = String(config.whatsappPrimary || '').replace(/\D/g, '');

if (!/^https:\/\/buy\.stripe\.com\//i.test(paymentUrl)) {
  throw new Error('Missing valid Nigeria book-only Stripe payment URL.');
}

let html = await readFile(pagePath, 'utf8');
const formPattern = /<form\b[^>]*name=["']divine-blueprint-nigeria-order["'][\s\S]*?<\/form>/i;
if (!formPattern.test(html)) throw new Error('Nigeria order form was not found for Stripe conversion.');

const whatsappHelpUrl = whatsapp
  ? `https://wa.me/${whatsapp}?text=${encodeURIComponent('Hello, I need help with delivery for my paid Nigeria order of The Divine Blueprint paperback.')}`
  : '#';

const stripeBlock = `<div class="order-form" data-stripe-checkout="true" data-book-only-checkout="true" data-whatsapp-required="true" data-email-required="true">
  <div class="order-payment-note" style="border-left-width:5px"><strong>Important — delivery is not included in this payment.</strong><br>This checkout covers <strong>The Divine Blueprint paperback only</strong>. <strong>Your email address and WhatsApp number are required at checkout.</strong> After payment, our team will use these details to confirm your order and contact you on WhatsApp about your delivery arrangement and delivery fee.</div>
  <div class="order-total" data-book-only-total="true" style="display:grid;gap:8px">
    <div style="display:flex;justify-content:space-between;gap:18px"><span>Book payment</span><strong>₦${bookPrice.toLocaleString('en-NG')}</strong></div>
    <div style="display:flex;justify-content:space-between;gap:18px;padding-top:8px;border-top:1px solid rgba(16,47,94,.14)"><span>Delivery fee</span><strong>Not included</strong></div>
  </div>
  <p class="order-help" style="text-align:left;margin:0"><strong>What happens next?</strong> Complete the book payment securely with Stripe and enter your required email address and WhatsApp number. We will then send you a separate WhatsApp message about delivery. Delivery charges are paid separately and are not part of the amount shown here.</p>
  <p class="order-help" id="referral-attribution" hidden style="display:none"></p>
  <a class="order-submit" id="stripe-pay-button" href="${paymentUrl}" style="display:flex;align-items:center;justify-content:center;text-decoration:none!important">Pay ₦${bookPrice.toLocaleString('en-NG')} for the book</a>
  <p class="order-help">You can choose 1–3 copies during secure checkout. For 4+ copies, contact us for a bulk order. Need help with your order or delivery? <a href="${whatsappHelpUrl}" target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>.</p>
</div>`;

html = html
  .replace('Tell us where to send your copy', 'Complete your secure book payment')
  .replace(
    'Complete the details below to reserve your copy. We will use your information only to process this order, arrange payment, and coordinate delivery.',
    'Pay securely for your paperback copy. Your email address and WhatsApp number are required during checkout so we can confirm your order and arrange delivery after payment. Delivery is arranged separately, and the delivery fee is not included in this checkout.'
  )
  .replace('<li>Local delivery details collected with your order</li>', '<li>Required email address and WhatsApp number collected during secure checkout</li>')
  .replace('<li>Order support available through WhatsApp</li>', '<li>Delivery fee is separate from the book payment</li>')
  .replace(formPattern, stripeBlock)
  .replace(/<script>\(\(\)=>\{const q=document\.getElementById\('quantity'\)[\s\S]*?<\/script>/i, '');

const runtime = `<script>(()=>{
const BASE_PAYMENT_URL=${JSON.stringify(paymentUrl)};
const REF_KEY='divine_blueprint_referral';
const REF_MAX_AGE=30*24*60*60*1000;
const referralEl=document.getElementById('referral-attribution');
const button=document.getElementById('stripe-pay-button');
const normalizeRef=(value)=>{const cleaned=String(value||'').trim().toUpperCase();return /^[A-Z0-9_-]{2,64}$/.test(cleaned)?cleaned:'';};
const rememberRef=(id)=>{if(!id)return;try{localStorage.setItem(REF_KEY,JSON.stringify({id,ts:Date.now()}));}catch{}};
const storedRef=()=>{try{const raw=localStorage.getItem(REF_KEY);if(!raw)return '';const record=JSON.parse(raw);const id=normalizeRef(record?.id);const ts=Number(record?.ts||0);if(!id||!ts||(Date.now()-ts)>REF_MAX_AGE){localStorage.removeItem(REF_KEY);return '';}return id;}catch{return '';}};
const getReferral=()=>{
  const incoming=normalizeRef(new URLSearchParams(location.search).get('ref'));
  if(incoming){rememberRef(incoming);return incoming;}
  const shared=normalizeRef(window.DivineBlueprintReferral?.get?.());
  return shared||storedRef();
};
const withReferral=(url)=>{const ref=getReferral();if(!ref)return url;const target=new URL(url);target.searchParams.set('client_reference_id',ref);return target.toString();};
const activeReferral=getReferral();
if(button) button.href=withReferral(BASE_PAYMENT_URL);
if(activeReferral&&referralEl){referralEl.textContent='Ambassador referral '+activeReferral+' applied automatically.';referralEl.hidden=false;referralEl.style.display='block';}
})();</script>`;
html = html.replace('</body>', `${runtime}\n</body>`);

for (const forbidden of [
  'Choose standard delivery or free pickup',
  'How would you like to receive your book?',
  'Select delivery or pickup',
  'delivery-state',
  'Free pickup — Lagos',
  'Free pickup — Ibadan'
]) {
  if (html.includes(forbidden)) throw new Error(`Delivery-price option remained in Nigeria checkout: ${forbidden}`);
}
for (const required of [
  'delivery is not included in this payment',
  'Delivery fee</span><strong>Not included',
  'Your email address and WhatsApp number are required at checkout',
  'separate WhatsApp message about delivery',
  paymentUrl
]) {
  if (!html.includes(required)) throw new Error(`Nigeria book-only checkout is missing: ${required}`);
}

await writeFile(pagePath, html, 'utf8');

let thanks = await readFile(thanksPath, 'utf8');
thanks = thanks
  .replace(/<title>Order Details Received \| The Divine Blueprint<\/title>/i, '<title>Preorder Confirmed | The Divine Blueprint</title>')
  .replace('Your Divine Blueprint Nigeria paperback order details have been received.', 'Your Divine Blueprint Nigeria paperback book payment has been completed.')
  .replace('Order Details Received', 'Payment Successful')
  .replace('Your Nigeria paperback order details have been received. We will use the contact information you provided to send the secure payment and delivery instructions.', 'Your Nigeria paperback book payment has been completed securely through Stripe.')
  .replace('Your copy is confirmed once payment is received.', 'Your book order is confirmed. Delivery is not included in this payment. We will contact you separately using the WhatsApp number you provided at checkout to confirm delivery arrangements and the delivery fee.')
  .replace(
    '<a href="/">Return to The Divine Blueprint</a>',
    `<p class="order-payment-note" style="text-align:left;margin:22px 0 8px"><strong>Delivery is separate.</strong><br>Please watch for a WhatsApp message from our team at the number you provided during checkout. The delivery fee will be communicated and handled separately from your book payment.</p>\n    <a href="${whatsappHelpUrl}" target="_blank" rel="noopener noreferrer">Delivery help on WhatsApp</a>\n    <a href="/" style="margin-left:8px">Return to The Divine Blueprint</a>`
  );

if (!thanks.includes('Delivery is separate.')) throw new Error('Nigeria payment confirmation is missing the separate-delivery notice.');
await writeFile(thanksPath, thanks, 'utf8');

await writeFile(statusPath, [
  'NIGERIA_ORDER_PAGE=ACTIVE',
  'ORDER_PATH=/nigeria-order/',
  'PRODUCT=PAPERBACK',
  `MODE=${String(config.mode || 'standard').toLowerCase()}`,
  `PRICE=${String(config.paperbackPriceNigeria || '₦10,000')}`,
  'FORM_BACKEND=STRIPE_CHECKOUT',
  'PAYMENT_PROCESSOR=STRIPE',
  'CHECKOUT=BOOK_ONLY',
  'EMAIL_REQUIRED=YES',
  'WHATSAPP_REQUIRED=YES',
  'DELIVERY_PRICE_OPTIONS=REMOVED',
  'DELIVERY_FEE_INCLUDED=NO',
  'DELIVERY_ARRANGEMENT=WHATSAPP_AFTER_PAYMENT',
  'AFFILIATE_ATTRIBUTION=REFERRAL_LINK',
  'AFFILIATE_STRIPE_FIELD=CLIENT_REFERENCE_ID',
  'AFFILIATE_WINDOW_DAYS=30'
].join('\n') + '\n', 'utf8');

console.log('Connected Nigeria paperback order page to book-only Stripe checkout with required email and WhatsApp details and delivery arranged separately after payment.');
