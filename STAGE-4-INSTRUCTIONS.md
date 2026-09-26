# Stage 4 — Live Etsy shop integration

This version replaces the local gallery with live active listings from Brett's Etsy shop.

## Why OAuth is not required for this display-only integration

Etsy's current Open API v3 provides `findAllActiveListingsByShop`, `findShops`, and the batch listing endpoint as API-key authenticated public-read endpoints. We therefore do not need to store OAuth access/refresh tokens just to display active public listings. The shared secret remains server-side in Cloudflare Pages Functions.

## 1. Copy files

Copy the contents of this package into the root of `brettsflowart-website`, allowing VS Code to merge folders and replace matching files.

## 2. Cloudflare secret

In Cloudflare: Workers & Pages → your Pages project → Settings → Variables and Secrets.

Add:

- `ETSY_SHARED_SECRET` — encrypted Secret — your Etsy app shared secret.
- `ETSY_KEYSTRING` — plain variable — `hractys6zbhergnu2xrk1bg3` (optional because the function also has this non-secret keystring as a fallback).

Do not commit the shared secret to Git.

## 3. Build locally

The Astro build itself does not call Etsy:

    npm run build

`npm run preview` only previews Astro's static output and does not emulate Cloudflare Pages Functions, so `/api/etsy/listings` will not work there.

For a full local Pages test, install Wrangler if necessary:

    npm install -D wrangler

Create `.dev.vars` in the project root (do not commit it):

    ETSY_SHARED_SECRET="your-secret-here"
    ETSY_KEYSTRING="hractys6zbhergnu2xrk1bg3"

Make sure `.gitignore` contains:

    .dev.vars*
    .env*

Then:

    npm run build
    npx wrangler pages dev dist

Open the URL Wrangler prints and visit `/shop/`.

## 4. Deploy

    git add .
    git commit -m "Replace local gallery with live Etsy shop"
    git pull --rebase origin main
    git push origin main

Cloudflare Pages will deploy the static Astro site plus the root-level `functions/` directory.

## 5. How >100 listings are handled

The Pages Function follows Etsy pagination at 100 listings per request until all active listing IDs have been retrieved. It then requests detailed listing records with images in batches of up to 100. The final catalogue response is cached at Cloudflare's edge for 15 minutes. The browser initially renders 24 listings and loads another 24 each time "Load more" is selected.

## 6. Cleanup

After the live shop is confirmed, use `REMOVE-OLD-GALLERY-FILES.txt` to remove the unused local gallery source and image files.
