# Stage 4.3 – Etsy authenticated listings fix

This replaces only `worker/index.js`.

## Why
Stage 4.2 made an unnecessary shop-owner lookup and a second batch request to hydrate listing images. Stage 4.3 instead:

- finds `BrettsFlowArt` using the same shop lookup that already worked in Stage 4.1;
- retrieves the seller's listings through the OAuth-protected `getListingsByShop` endpoint;
- requests `state=active` and `includes=Images` in the same request;
- paginates in batches of 100;
- keeps the existing OAuth token refresh and KV storage;
- reports a safe Etsy error detail if the API still rejects a request.

## Install
Copy `worker/index.js` over the existing file in your project.

Then run:

```bash
npm run build
git add worker/index.js
git commit -m "Fix authenticated Etsy listing retrieval"
git pull --rebase origin main
git push origin main
```

If your Git push does not automatically deploy the Worker, run:

```bash
npx wrangler deploy
```

You do **not** need to create a new KV namespace or re-enter the shared secret.

You should also **not** need to reconnect OAuth because the existing `listings_r` token is sufficient.

After deployment test:

`https://brettsflowart.au/api/etsy/listings`

Expected result with the current shop is `count: 3` plus the three listing objects.

If Etsy still rejects the request, the JSON response now includes a `detail` field. Copy that complete response back into ChatGPT.
