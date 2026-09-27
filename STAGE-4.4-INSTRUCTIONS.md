# Stage 4.4 — Homepage and Etsy layout refinements

This patch changes only the presentation layer. It does **not** modify the working Etsy OAuth/API Worker from Stage 4.3.

## Changes

1. Removed the standalone “Visit Brett's Flow Art on Etsy” link from both the homepage and Shop page.
2. Removed the dedicated **Shop** column from the footer. The normal **Shop artwork** link remains under **Explore**.
3. Moved **Available now** above **About Brett** on the homepage.
4. Homepage **Available now** now shows a maximum of **3** active Etsy listings, randomly selected on each page load.
5. Section heading/introduction text now uses the full width of the same `.shell` container used by the contact card.
6. Removed the direct Etsy-store button from the listing-load error state. Individual artwork cards still link to Etsy so purchases can be completed there.

## Install

Copy the `src` folder in this package over the `src` folder in the website project, allowing these four files to be replaced:

- `src/pages/index.astro`
- `src/pages/shop.astro`
- `src/components/EtsyListings.astro`
- `src/components/SiteFooter.astro`

Do not replace `worker/index.js`; keep the working Stage 4.3 Worker.

## Build

```bash
npm run build
```

Then commit and push:

```bash
git add -A
git commit -m "Refine Etsy shop layout and homepage preview"
git pull --rebase origin main
git push origin main
```
