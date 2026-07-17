# The Gleaning Ground Migration Checklist

## Stage 1 — Publish the redesign safely

- [ ] Create the GitHub repository `apikujuni-source/the-gleaning-ground`.
- [ ] Upload the source-package contents to the repository's `main` branch.
- [ ] Import the repository into Netlify.
- [ ] Confirm Netlify uses `npm run build` and publishes `_site`.
- [ ] Test the temporary `netlify.app` URL on desktop and mobile.
- [ ] Submit the contact and newsletter forms and verify they appear in Netlify Forms.

## Stage 2 — Activate the editing dashboard

- [ ] Create a GitHub OAuth App.
- [ ] Set the app homepage to the Netlify preview URL.
- [ ] Set the callback URL to `https://api.netlify.com/auth/done`.
- [ ] Add the GitHub OAuth Client ID and Secret to Netlify's authentication provider settings.
- [ ] Visit `/admin/` and sign in with the GitHub account that owns the repository.
- [ ] Publish one test devotional and confirm Netlify deploys it automatically.

## Stage 3 — Preserve everything on Hostinger

- [ ] Save every current page's text and screenshots.
- [ ] Download all images, PDFs, and other media.
- [ ] Record old page URLs for redirects.
- [ ] Export form submissions and subscriber information.
- [ ] Record SEO titles and descriptions.
- [ ] List all domain email accounts and aliases.
- [ ] Confirm where the domain is registered and its renewal date.

## Stage 4 — Move the domain

- [ ] Add `thegleaningground.com` and `www.thegleaningground.com` to Netlify.
- [ ] Configure the DNS records Netlify provides.
- [ ] Preserve email MX, SPF, DKIM, and DMARC records.
- [ ] Confirm HTTPS is active.
- [ ] Test the root domain and `www` version.
- [ ] Add redirects for old Hostinger URLs that changed.

## Stage 5 — Leave Hostinger completely

- [ ] Migrate professional email to a separate provider before cancellation.
- [ ] Verify sending and receiving on all ministry addresses.
- [ ] Transfer the domain registration away from Hostinger if desired.
- [ ] Keep Hostinger active during a short overlap period.
- [ ] Cancel Hostinger only after the new site, forms, email, and domain are confirmed.
