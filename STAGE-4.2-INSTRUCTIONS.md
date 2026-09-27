# Stage 4.2 — Etsy OAuth listing fix

This patch switches the catalogue from Etsy's public `findAllActiveListingsByShop` endpoint to the authenticated `getListingsByShop?state=active` endpoint.

The public endpoint can lag or under-report active listings. Your shop has active listings but it returned zero, so this patch uses your Seller App's OAuth access with the minimum `listings_r` scope.

## 1. Replace the Worker

Copy `worker/index.js` into the project root and replace the current `worker/index.js`.

## 2. Create a Cloudflare KV namespace for Etsy OAuth tokens

From the project root run:

```bash
npx wrangler kv namespace create BRETT_ETSY_TOKENS --binding ETSY_TOKENS --update-config
```

Wrangler should create the namespace and update `wrangler.jsonc` with an `ETSY_TOKENS` KV binding.

If your Wrangler version does not update the config automatically, copy the `id` it prints and add this to `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "ETSY_TOKENS",
    "id": "PASTE_THE_NAMESPACE_ID_HERE"
  }
]
```

Keep the existing `assets`, `main`, `name`, and other settings.

## 3. Keep the existing Etsy variables

The Worker still needs:

- `ETSY_KEYSTRING` — normal variable
- `ETSY_SHARED_SECRET` — encrypted secret

Do not put the shared secret in Git or source code.

## 4. Build, commit and deploy

```bash
npm run build
git add -A
git commit -m "Use Etsy OAuth for active shop listings"
git pull --rebase origin main
git push origin main
```

If Cloudflare does not automatically deploy from Git, run:

```bash
npx wrangler deploy
```

## 5. Connect Etsy once

After the new Worker is deployed, open:

https://brettsflowart.au/api/etsy/connect

Etsy will ask you to authorise the Seller App with `listings_r` permission. Approve it while logged into the Etsy account that owns BrettsFlowArt.

Etsy should return you to:

https://brettsflowart.au/api/etsy/callback

and show "Etsy connected successfully".

## 6. Test

Open:

https://brettsflowart.au/api/etsy/status

Expected: `connected: true`.

Then open:

https://brettsflowart.au/api/etsy/listings

With the current shop state, `count` should be 3. The response also exposes `etsyReportedActiveCount` and `shopId` for diagnostics.

## Notes

- Access tokens are refreshed automatically.
- The refresh token is stored in Cloudflare KV, not in GitHub or browser-side JavaScript.
- The catalogue supports more than 100 listings using Etsy pagination in batches of 100.
- Catalogue cache is now 5 minutes and uses a new cache key, so the previous cached zero result will not be reused.
- The registered Etsy callback must remain exactly `https://brettsflowart.au/api/etsy/callback`.
