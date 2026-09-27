# Stage 4.1 — Cloudflare Worker routing fix

## Why the Etsy API route returned 404

The live site is deployed as a Cloudflare **Worker with static assets**, not as a Cloudflare Pages project. The Stage 4 package used a root-level `/functions` directory, which Cloudflare Pages understands but a Worker static-assets deployment does not. As a result, the static shop page deployed, but `/api/etsy/listings` did not exist.

This patch adds a real Worker entry point and routes `/api/etsy/*` through it while continuing to serve the Astro `dist` directory as static assets.

## 1. Copy these files into the repository root

Copy:

- `worker/index.js`
- `wrangler.jsonc`

into the root of `brettsflowart-website`.

The old `functions/api/etsy/listings.js` file can remain temporarily, but it is not used by the Worker deployment. Once the new endpoint works, you can delete the entire `functions/` directory.

## 2. Confirm Cloudflare runtime variables

In the Cloudflare Worker project, under **Settings → Variables and Secrets**, confirm the Production environment contains:

- `ETSY_KEYSTRING` = `hractys6zbhergnu2xrk1bg3`
- `ETSY_SHARED_SECRET` = your Etsy shared secret, stored as an encrypted secret

Do not put `ETSY_SHARED_SECRET` in GitHub or source files.

## 3. Confirm build/deploy commands

For a Git-connected Cloudflare Worker, use:

Build command:

    npm run build

Deploy command:

    npx wrangler deploy

Cloudflare Workers Builds normally defaults to `npx wrangler deploy`, but check the project's Build settings if the API route is still missing after deployment.

## 4. Build locally

    npm run build

Optional full Worker test:

Create `.dev.vars` in the project root (do not commit it):

    ETSY_KEYSTRING="hractys6zbhergnu2xrk1bg3"
    ETSY_SHARED_SECRET="your-secret-here"

Make sure `.gitignore` includes:

    .dev.vars*
    .env*

Then run:

    npx wrangler dev

and open:

    http://localhost:8787/api/etsy/listings

## 5. Commit and deploy

    git add worker/index.js wrangler.jsonc
    git commit -m "Fix Etsy API route for Cloudflare Worker"
    git pull --rebase origin main
    git push origin main

## 6. Verify after Cloudflare finishes deploying

Open:

    https://brettsflowart.au/api/etsy/listings

Expected result: JSON containing fields such as `shop`, `count`, and `listings`.

If you instead receive:

- `ETSY_SECRET_MISSING`: the Worker does not have the Etsy shared secret in its Production runtime variables.
- `ETSY_API_ERROR`: routing is fixed, but Etsy rejected or failed an API request. Check Cloudflare Worker logs for the exact Etsy status/error.
- `404`: the new Worker entry point has not been deployed; check the deploy command and that `wrangler.jsonc` is at the repository root.

Once the API URL returns listing JSON, `/shop/` and the homepage Etsy section will start working without further front-end changes.
