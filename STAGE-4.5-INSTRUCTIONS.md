# Stage 4.5 — Visual tuning

This patch changes only presentation/layout. It does not alter the working Etsy API Worker.

## Changes
- Shop page “Shop Brett's work” heading is white and 30% smaller.
- Homepage H2 section headings use the same Caveat font, weight and size as that shop heading.
- The gap between the “View all artwork” button and About Brett is reduced to 30% of the previous section spacing.
- Dark mode is the default for visitors who have not already chosen a theme. Existing saved light/dark choices are still respected.

## Install
Copy the included `src` folder over the project `src` folder and allow these files to be replaced:

- `src/pages/index.astro`
- `src/pages/shop.astro`
- `src/layouts/MainLayout.astro`

Then run:

```bash
npm run build
```

If successful:

```bash
git add -A
git commit -m "Refine headings spacing and dark theme default"
git pull --rebase origin main
git push origin main
```

No Etsy, OAuth, KV, Worker, or Cloudflare secret changes are required.
