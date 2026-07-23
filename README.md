# The Gleaning Ground — Netlify + Decap CMS

This repository contains the redesigned ministry website for Netlify. The complete Eleventy source is stored in `.source/tgg-source.tar.gz` and is unpacked automatically during the Netlify build.

## Deploy to Netlify

1. In Netlify choose **Add new project → Import an existing project → GitHub**.
2. Select `apikujuni-source/the-gleaning-ground`.
3. Netlify will read `netlify.toml` automatically.
4. Build command: `npm run build`
5. Publish directory: `_site`

## Editing content

The deployed site includes a Decap CMS dashboard at `/admin/`. Configure GitHub OAuth in Netlify before using it.

## Local preview

```bash
npm install
npm run dev
```

## Migration caution

Do not cancel Hostinger until the new website, domain, email, forms, and redirects have all been tested.


## Editing the Divine Blueprint homepage cover

1. Open https://gleaningground.com/admin/.
2. Choose **The Divine Blueprint**.
3. Open **Homepage Settings**.
4. Upload the new image under **Homepage Book Cover**.
5. Update the alt text if needed.
6. Choose **Save** and then **Publish**.

The CMS stores the uploaded image in `content/uploads`. The Netlify build copies the selected image into the standalone Divine Blueprint site and uses it for the homepage hero without running it through the canonical-cover replacement.
