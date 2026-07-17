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
