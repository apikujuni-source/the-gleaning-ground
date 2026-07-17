# The Gleaning Ground — Netlify + Decap CMS

This is a complete redesigned ministry website built with Eleventy and designed for Netlify continuous deployment. Routine content can be updated from `/admin/` through Decap CMS without paying for AI prompts.

## Included

- Responsive ministry homepage
- About, devotionals, teachings, books, resources, children & family, contact
- Dedicated Divine Blueprint platform page
- Searchable devotional library
- Netlify contact and newsletter forms
- Decap CMS content dashboard
- Git-based history and backups
- SEO metadata, redirects, and security headers

## Local preview

```bash
npm install
npm run dev
```

Open `http://localhost:8080`.

## CMS local preview

In a second terminal:

```bash
npm run cms
```

Then open `http://localhost:8080/admin/`.

## Intended GitHub repository

`apikujuni-source/the-gleaning-ground`

The Decap configuration already points to this repository name.

## Publish through GitHub and Netlify

1. Create an empty GitHub repository called `the-gleaning-ground` under `apikujuni-source`.
2. Upload or push all files in this folder to the repository's `main` branch.
3. In Netlify, choose **Add new project → Import an existing project → GitHub**.
4. Select `apikujuni-source/the-gleaning-ground`.
5. Netlify will read `netlify.toml`; the build command is `npm run build` and publish folder is `_site`.
6. After the temporary Netlify URL works, add `thegleaningground.com` under Domain management.

## Enable `/admin/` without deprecated Git Gateway

This project uses Decap's direct GitHub backend. Every CMS editor must have write access to the GitHub repository.

1. In GitHub, create an OAuth App:
   - Homepage URL: your Netlify site URL, for example `https://the-gleaning-ground.netlify.app`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. Copy the Client ID and Client Secret.
3. In Netlify go to **Project configuration → Access & security → OAuth → Authentication providers**.
4. Install the GitHub provider and enter the Client ID and Secret.
5. Visit `https://YOUR-SITE/admin/` and log in with the GitHub account that has repository write access.

## Content editing

From `/admin/`, you can create or update:

- Devotionals
- Teachings and podcasts
- Books
- Downloadable resources
- General site settings

When you click Publish, Decap commits the change to GitHub and Netlify deploys the updated website automatically.

## Before moving the live domain

- Back up all Hostinger pages, media, forms, SEO titles, and email accounts.
- Add your final ministry images and real social URLs.
- Replace placeholder book/store links.
- Set up professional email with a separate provider before cancelling Hostinger.
- Test forms, mobile layout, `/admin/`, `www`, root domain, and HTTPS.
