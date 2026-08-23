import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const siteRoot = '_site/divine-blueprint-site';
const pagePath = join(siteRoot, 'nigeria-order', 'index.html');
const thanksPath = join(siteRoot, 'nigeria-order', 'thanks', 'index.html');
const statusPath = join(siteRoot, 'nigeria-order-page-status.txt');
const config = JSON.parse(await readFile('content/divine-blueprint/purchase.json', 'utf8'));
const delivery = config.nigeriaDelivery || {};
const pickup = config.nigeriaPickup || {};
const bookPrice = Number(String(config.paperbackPriceNigeria || '₦10,000').replace(/[^0-9.]/g, '')) || 10000;

for (const key of ['lagos', 'oyo', 'southwest', 'centralSouth', 'north']) {
  const url = String(delivery[key]?.stripeUrl || '');
  if (!/^https:\/\/buy\.stripe\.com\//i.test(url)) throw new Error(`Missing valid Nigeria Stripe URL for ${key}`);
  if (!Number.isFinite(Number(delivery[key]?.fee))) throw new Error(`Missing Nigeria delivery fee for ${key}`);
}
for (const key of ['lagos', 'ibadan']) {
  const url = String(pickup[key]?.stripeUrl || '');
  if (!/^https:\/\/buy\.stripe\.com\//i.test(url)) throw new Error(`Missing valid Nigeria pickup Stripe URL for ${key}`);
}

const zones = {
  Lagos: 'lagos',
  Oyo: 'oyo',
  Ogun: 'southwest', Osun: 'southwest', Ondo: 'southwest', Ekiti: 'southwest',
  'Federal Capital Territory': 'centralSouth', Abuja: 'centralSouth',
  Benue: 'centralSouth', Kogi: 'centralSouth', Kwara: 'centralSouth', Nasarawa: 'centralSouth', Niger: 'centralSouth', Plateau: 'centralSouth',
  Abia: 'centralSouth', Anambra: 'centralSouth', Ebonyi: 'centralSouth', Enugu: 'centralSouth', Imo: 'centralSouth',
  'Akwa Ibom': 'centralSouth', Bayelsa: 'centralSouth', 'Cross River': 'centralSouth', Delta: 'centralSouth', Edo: 'centralSouth', Rivers: 'centralSouth',
  Adamawa: 'north', Bauchi: 'north', Borno: 'north', Gombe: 'north', Taraba: 'north', Yobe: 'north',
  Jigawa: 'north', Kaduna: 'north', Kano: 'north', Katsina: 'north', Kebbi: 'north', Sokoto: 'north', Zamfara: 'north'
};
const states = [...new Set(Object.keys(zones).filter((state) => state !== 'Abuja'))].sort((a,b)=>a.localeCompare(b));
const zonePayload = Object.fromEntries(Object.entries(delivery).map(([key, value]) => [key, { fee: Number(value.fee), url: String(value.stripeUrl), label: String(value.label || key) }]));
const pickupPayload = Object.fromEntries(Object.entries(pickup).map(([key, value]) => [key, { fee: 0, url: String(value.stripeUrl), label: String(value.label || key) }]));
const whatsapp = String(config.whatsappPrimary || '').replace(/\D/g, '');

let html = await readFile(pagePath, 'utf8');
const formPattern = /<form\b[^>]*name=["']divine-blueprint-nigeria-order["'][\s\S]*?<\/form>/i;
if (!formPattern.test(html)) throw new Error('Nigeria order form was not found for Stripe conversion.');

const stateOptions = states.map((state) => `<option value="${state}">${state}</option>`).join('');
const stripeBlock = `<div class="order-form" data-stripe-checkout="true">
  <div class="order-payment-note"><strong>Secure checkout with Stripe</strong><br>Choose standard delivery or free pickup. For delivery, we calculate a standard Nigeria rate from the nearer Lagos or Ibadan dispatch point. For pickup, there is no delivery charge.</div>
  <div class="order-field">
    <label for="fulfillment-method">How would you like to receive your book?</label>
    <select id="fulfillment-method" required>
      <option value="" selected disabled>Select delivery or pickup</option>
      <option value="delivery">Standard delivery</option>
      <option value="pickup-lagos">Free pickup — Lagos</option>
      <option value="pickup-ibadan">Free pickup — Ibadan</option>
    </select>
  </div>
  <div class="order-field" id="delivery-state-wrap" hidden style="display:none">
    <label for="delivery-state">Delivery state</label>
    <select id="delivery-state"><option value="" selected disabled>Select your state</option>${stateOptions}</select>
  </div>
  <div class="order-total" data-delivery-breakdown="true" style="display:grid;gap:8px">
    <div style="display:flex;justify-content:space-between;gap:18px"><span>Book preorder</span><strong>₦${bookPrice.toLocaleString('en-NG')}</strong></div>
    <div style="display:flex;justify-content:space-between;gap:18px"><span id="fulfillment-label">Delivery / pickup</span><strong id="delivery-fee">Select option</strong></div>
    <div style="display:flex;justify-content:space-between;gap:18px;padding-top:8px;border-top:1px solid rgba(16,47,94,.14)"><span>Total for 1 copy</span><strong id="delivery-total">—</strong></div>
  </div>
  <p class="order-help" id="delivery-route-note">Choose delivery or pickup to see your total.</p>
  <a class="order-submit" id="stripe-pay-button" href="#" aria-disabled="true" style="display:flex;align-items:center;justify-content:center;text-decoration:none!important;opacity:.55;pointer-events:none">Choose delivery or pickup</a>
  <p class="order-help">You can choose 1–3 copies during secure checkout. For 4+ copies, contact us for a bulk order or delivery quote. Need help? <a href="https://wa.me/${whatsapp}?text=${encodeURIComponent('Hello, I need help with my Nigeria preorder for The Divine Blueprint paperback.')}" target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>.</p>
</div>`;

html = html
  .replace('Tell us where to send your copy', 'Complete your secure preorder')
  .replace('Complete the details below to reserve your copy. We will use your information only to process this order, arrange payment, and coordinate delivery.', 'Choose delivery or free pickup, review your total, then continue to Stripe to complete payment securely.')
  .replace(formPattern, stripeBlock)
  .replace(/<script>\(\(\)=>\{const q=document\.getElementById\('quantity'\)[\s\S]*?<\/script>/i, '');

const runtime = `<script>(()=>{
const stateToZone=${JSON.stringify(zones)};
const zoneData=${JSON.stringify(zonePayload)};
const pickupData=${JSON.stringify(pickupPayload)};
const book=${bookPrice};
const method=document.getElementById('fulfillment-method');
const stateWrap=document.getElementById('delivery-state-wrap');
const stateSelect=document.getElementById('delivery-state');
const feeEl=document.getElementById('delivery-fee');
const totalEl=document.getElementById('delivery-total');
const rowLabel=document.getElementById('fulfillment-label');
const note=document.getElementById('delivery-route-note');
const button=document.getElementById('stripe-pay-button');
const money=(v)=>'₦'+Number(v).toLocaleString('en-NG');
const disable=(text)=>{button.href='#';button.textContent=text;button.style.opacity='.55';button.style.pointerEvents='none';button.setAttribute('aria-disabled','true');};
const enable=(url,text)=>{button.href=url;button.textContent=text;button.style.opacity='1';button.style.pointerEvents='auto';button.removeAttribute('aria-disabled');};
const showDeliveryState=(show)=>{
  stateWrap.hidden=!show;
  stateWrap.style.display=show?'grid':'none';
  if(!show) stateSelect.value='';
};
const setPickup=(city)=>{
  const option=pickupData[city];
  showDeliveryState(false);
  rowLabel.textContent='Pickup';
  feeEl.textContent='Free';
  totalEl.textContent=money(book);
  note.textContent='Free pickup in '+(city==='lagos'?'Lagos':'Ibadan')+'. Exact pickup location and collection instructions will be provided after payment.';
  enable(option.url,'Pay '+money(book)+' securely with Stripe');
};
const setDelivery=()=>{
  showDeliveryState(true);
  rowLabel.textContent='Standard delivery';
  feeEl.textContent='Select state';
  totalEl.textContent='—';
  note.textContent='Select your delivery state to calculate the standard delivery charge.';
  disable('Select a delivery state');
};
method?.addEventListener('change',()=>{
  if(method.value==='delivery') return setDelivery();
  if(method.value==='pickup-lagos') return setPickup('lagos');
  if(method.value==='pickup-ibadan') return setPickup('ibadan');
});
stateSelect?.addEventListener('change',()=>{
  if(method.value!=='delivery') return;
  const zoneKey=stateToZone[stateSelect.value];
  const zone=zoneData[zoneKey];
  if(!zone)return;
  feeEl.textContent=money(zone.fee);
  totalEl.textContent=money(book+zone.fee);
  note.textContent='Standard delivery to '+stateSelect.value+': '+money(zone.fee)+'. Dispatch will be routed from Lagos or Ibadan as appropriate.';
  enable(zone.url,'Pay '+money(book+zone.fee)+' securely with Stripe');
});
})();</script>`;
html = html.replace('</body>', `${runtime}\n</body>`);
await writeFile(pagePath, html, 'utf8');

let thanks = await readFile(thanksPath, 'utf8');
thanks = thanks
  .replace(/<title>Order Details Received \| The Divine Blueprint<\/title>/i, '<title>Preorder Confirmed | The Divine Blueprint</title>')
  .replace('Your Divine Blueprint Nigeria paperback order details have been received.', 'Your Divine Blueprint Nigeria paperback preorder payment has been completed.')
  .replace('Order Details Received', 'Payment Successful')
  .replace('Your Nigeria paperback order details have been received. We will use the contact information you provided to send the secure payment and delivery instructions.', 'Your Nigeria paperback preorder payment has been completed securely through Stripe. Your delivery or pickup choice is now recorded for fulfillment.')
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
  'FULFILLMENT=DELIVERY_OR_FREE_PICKUP',
  'PICKUP_LAGOS=FREE',
  'PICKUP_IBADAN=FREE',
  'DELIVERY_CALCULATION=STATE_BASED_LAGOS_IBADAN',
  'DELIVERY_LAGOS=3500',
  'DELIVERY_OYO=3000',
  'DELIVERY_SOUTHWEST=4000',
  'DELIVERY_CENTRAL_SOUTH=5000',
  'DELIVERY_NORTH=6000'
].join('\n') + '\n', 'utf8');

console.log('Connected Nigeria paperback order page to Stripe delivery and free pickup checkout.');
