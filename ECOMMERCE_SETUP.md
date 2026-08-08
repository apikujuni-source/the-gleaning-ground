# Gleaning Ground Ecommerce Activation

The storefront is generated at:

- `https://gleaningground.com/shop/`

The code is complete, but live payments remain safely disabled until the private payment credentials and shipping amounts below are added in Netlify.

## Netlify environment variables

Open **Netlify → Project configuration → Environment variables** and add:

### Required for all checkouts

- `PUBLIC_SITE_URL=https://gleaningground.com`

### Stripe: US and international paperback

- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_US_SHIPPING_CENTS` — shipping charge in US cents, for example `499` for $4.99
- `STRIPE_CANADA_SHIPPING_CENTS`
- `STRIPE_UK_EU_SHIPPING_CENTS`
- `STRIPE_INTERNATIONAL_SHIPPING_CENTS`
- `STRIPE_ALLOWED_INTERNATIONAL_COUNTRIES` — comma-separated ISO country codes for the “Other supported country” option, for example `AU,NZ,ZA,GH,KE`

Optional:

- `STRIPE_AUTOMATIC_TAX=true` only after Stripe Tax has been configured and reviewed in the Stripe dashboard.

The paperback product price is enforced by the server at **$10.99 per copy**. Direct checkout is limited to 10 copies; larger orders use the bulk-order form.

### Paystack: Nigeria paperback

- `PAYSTACK_SECRET_KEY=sk_live_...`

The Nigeria paperback price is enforced by the server at **₦8,000 per copy**. Delivery is coordinated separately after payment.

## Provider setup

1. Create or verify the Stripe and Paystack business accounts.
2. Complete identity, bank and business verification with each provider.
3. Add the live secret keys to Netlify. Never place a secret key in a webpage, GitHub file or CMS field.
4. Decide and enter the four Stripe shipping amounts.
5. Redeploy the site after saving the variables.
6. Run one low-value live test order through each provider and refund the test transactions.
7. Confirm that Stripe and Paystack receipts, shipping addresses, phone numbers and order metadata appear correctly in their dashboards.

## Safe fallback behavior

Until credentials or shipping charges are configured:

- International customers are returned to the store with instructions to use Amazon or email support.
- Nigerian customers are returned to the store with instructions to use WhatsApp or email support.
- No customer payment details are collected by the website itself.

## Order verification

- Stripe confirmation checks payment status, currency and the expected $10.99 subtotal per copy.
- Paystack confirmation checks transaction success, NGN currency and the expected ₦8,000 amount per copy.
- Provider dashboards remain the operational record for fulfilment, refunds and disputes.

## Preorder policy displayed on the store

Payment is collected at checkout. Dispatch timing will be announced by email. Customers may cancel for a full refund before dispatch.
