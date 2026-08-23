import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const siteRoot = '_site/divine-blueprint-site';
const pagePath = join(siteRoot, 'nigeria-order', 'index.html');
const thanksPath = join(siteRoot, 'nigeria-order', 'thanks', 'index.html');
const statusPath = join(siteRoot, 'nigeria-order-page-status.txt');
const config = JSON.parse(await readFile('content/divine-blueprint/purchase.json', 'utf8'));
const paymentUrl = String(config.stripeNigeriaPaymentUrl || '').trim();

if (!/^https:\/\/buy\.stripe\.com\//i.test(paymentUrl)) {
  throw new Error('stripeNigeriaPaymentUrl must be a valid Stripe Payment Link URL.');
}

let html = await readFile(pagePath, 'utf8');
const formPattern = /<form\b[^>]*name=["']divine-blueprint-nigeria-order["'][\s\S]*?<\/form>/i;
if (!formPattern.test(html)) {
  throw new Error('Nigeria order form was not found for Stripe conversion.');
}

const stripeBlock = `<div class="order-form" data-stripe-checkout="true">
  <div class="order-payment-note"><strong>Secure checkout with Stripe</strong><br>Your payment, quantity, name, phone number, and Nigeria delivery address will be collected securely by Stripe. The Divine Blueprint website never receives your card details.</div>
  <a class="order-submit" href="${paymentUrl}" target="_self" rel="noopener" style="display:flex;align-items:center;justify-content:center;text-decoration:none!important">Pay securely with Stripe</a>
  <p class="order-help">You can choose between 1 and 10 copies during secure checkout. Need help before paying? <a href="https://wa.me/${String(config.whatsappPrimary || '').replace(/\D/g, '')}?text=${encodeURIComponent('Hello, I need help with my Nigeria preorder for The Divine Blueprint paperback.')}" target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>.</p>
</div>`;

html = html
  .replace('Tell us where to send your copy', 'Complete your secure preorder')
  .replace('Complete the details below to reserve your copy. We will use your information only to process this order, arrange payment, and coordinate delivery.', 'Continue to Stripe to choose your quantity, enter your contact and Nigeria delivery details, and complete payment securely.')
  .replace(formPattern, stripeBlock)
  .replace(/<script>\(\(\)=>\{const q=document\.getElementById\('quantity'\)[\s\S]*?<\/script>/i, '');

await writeFile(pagePath, html, 'utf8');

let thanks = await readFile(thanksPath, 'utf8');
thanks = thanks
  .replace(/<title>Order Details Received \| The Divine Blueprint<\/title>/i, '<title>Preorder Confirmed | The Divine Blueprint</title>')
  .replace('Your Divine Blueprint Nigeria paperback order details have been received.', 'Your Divine Blueprint Nigeria paperback preorder payment has been completed.')
  .replace('Order Details Received', 'Payment Successful')
  .replace('Your Nigeria paperback order details have been received. We will use the contact information you provided to send the secure payment and delivery instructions.', 'Your Nigeria paperback preorder payment has been completed securely through Stripe. Your order and delivery details are now recorded for fulfillment.')
  .replace('Your copy is confirmed once payment is received.', 'Your preorder is confirmed. Thank you for supporting The Divine Blueprint.');
await writeFile(thanksPath, thanks, 'utf8');

await writeFile(statusPath, [
  'NIGERIA_ORDER_PAGE=ACTIVE',
  'ORDER_PATH=/nigeria-order/',
  'PRODUCT=PAPERBACK',
  `MODE=${String(config.mode || 'standard').toLowerCase()}`,
  `PRICE=${String(config.paperbackPriceNigeria || '₦10,000')}`,
  'FORM_BACKEND=STRIPE_CHECKOUT',
  'PAYMENT_PROCESSOR=STRIPE',
  `STRIPE_PAYMENT_URL=${paymentUrl}`
].join('\n') + '\n', 'utf8');

console.log('Connected Nigeria paperback order page to live Stripe Checkout.');
