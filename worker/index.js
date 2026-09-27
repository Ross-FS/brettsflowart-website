const ETSY_API = 'https://openapi.etsy.com/v3/application';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const ETSY_AUTHORIZE_URL = 'https://www.etsy.com/oauth/connect';
const REDIRECT_URI = 'https://brettsflowart.au/api/etsy/callback';
const PAGE_SIZE = 100;
const CACHE_SECONDS = 300;
const TOKEN_KEY = 'etsy:oauth:tokens';
const PKCE_PREFIX = 'etsy:pkce:';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200
        ? `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`
        : 'no-store',
      ...extraHeaders,
    },
  });
}

function html(body, status = 200) {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Etsy connection</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:4rem auto;padding:0 1.25rem;line-height:1.55;color:#222}a{color:#5a3d8a}code{background:#f4f2f7;padding:.15rem .35rem;border-radius:.3rem}</style></head><body>${body}</body></html>`, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function money(price) {
  if (!price || typeof price.amount !== 'number' || !price.divisor) return null;
  return {
    amount: price.amount / price.divisor,
    currency: price.currency_code || 'AUD',
  };
}

function firstImage(listing) {
  const images = Array.isArray(listing.images) ? listing.images : [];
  const image = images.slice().sort((a, b) => (a.rank || 0) - (b.rank || 0))[0];
  if (!image) return null;
  return {
    src: image.url_570xN || image.url_fullxfull || image.url_170x135 || null,
    full: image.url_fullxfull || image.url_570xN || null,
    alt: image.alt_text || listing.title || 'Artwork by Brett Forbes-Stephen',
    width: image.full_width || null,
    height: image.full_height || null,
  };
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomUrlSafe(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64Url(value);
}

async function sha256UrlSafe(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

async function etsyFetch(path, apiKey, accessToken = null, init = {}) {
  const response = await fetch(`${ETSY_API}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'x-api-key': apiKey,
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Etsy API ${response.status}: ${body.slice(0, 800)}`);
  }

  return response.json();
}

async function tokenRequest(params) {
  const response = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Etsy OAuth ${response.status}: ${text.slice(0, 800)}`);
  }

  return data;
}

async function saveTokens(env, tokenData, previous = {}) {
  const stored = {
    ...previous,
    ...tokenData,
    expires_at: Date.now() + Number(tokenData.expires_in || 3600) * 1000,
    saved_at: Date.now(),
  };
  await env.ETSY_TOKENS.put(TOKEN_KEY, JSON.stringify(stored));
  return stored;
}

async function getStoredTokens(env) {
  return env.ETSY_TOKENS.get(TOKEN_KEY, { type: 'json' });
}

async function getAccessToken(env, keystring) {
  let tokens = await getStoredTokens(env);
  if (!tokens?.refresh_token) {
    const error = new Error('Etsy OAuth has not been connected yet.');
    error.code = 'ETSY_NOT_CONNECTED';
    throw error;
  }

  if (tokens.access_token && Number(tokens.expires_at || 0) > Date.now() + 120000) {
    return { accessToken: tokens.access_token, tokens };
  }

  const refreshed = await tokenRequest({
    grant_type: 'refresh_token',
    client_id: keystring,
    refresh_token: tokens.refresh_token,
  });

  tokens = await saveTokens(env, refreshed, tokens);
  return { accessToken: tokens.access_token, tokens };
}

async function getOwnShop(apiKey, accessToken) {
  const userId = String(accessToken || '').split('.')[0];
  if (!/^\d+$/.test(userId)) throw new Error('Could not determine Etsy user ID from OAuth token.');

  const shop = await etsyFetch(`/users/${userId}/shops`, apiKey);
  if (!shop?.shop_id) throw new Error('Could not determine the Etsy shop for the authorised seller.');
  return shop;
}

async function getAllActiveListings(shopId, apiKey, accessToken) {
  const all = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const data = await etsyFetch(
      `/shops/${shopId}/listings?state=active&limit=${PAGE_SIZE}&offset=${offset}`,
      apiKey,
      accessToken,
    );

    total = Number(data.count || 0);
    const page = Array.isArray(data.results) ? data.results : [];
    all.push(...page);

    if (page.length === 0) break;
    offset += page.length;
  }

  return all;
}

async function hydrateListings(listings, apiKey) {
  const results = [];

  for (let i = 0; i < listings.length; i += PAGE_SIZE) {
    const ids = listings
      .slice(i, i + PAGE_SIZE)
      .map((listing) => listing.listing_id)
      .filter(Boolean);

    if (ids.length === 0) continue;

    const params = new URLSearchParams();
    params.set('listing_ids', ids.join(','));
    params.set('includes', 'Images');

    const data = await etsyFetch(`/listings/batch?${params.toString()}`, apiKey);
    results.push(...(data.results || []));
  }

  return results;
}

async function handleConnect(env) {
  if (!env.ETSY_TOKENS) {
    return json({ error: 'ETSY_TOKENS KV binding is missing.', code: 'ETSY_KV_MISSING' }, 503);
  }

  const keystring = env.ETSY_KEYSTRING || 'hractys6zbhergnu2xrk1bg3';
  const state = randomUrlSafe(24);
  const verifier = randomUrlSafe(48);
  const challenge = await sha256UrlSafe(verifier);

  await env.ETSY_TOKENS.put(`${PKCE_PREFIX}${state}`, verifier, { expirationTtl: 600 });

  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'listings_r',
    client_id: keystring,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return Response.redirect(`${ETSY_AUTHORIZE_URL}?${params.toString()}`, 302);
}

async function handleCallback(request, env) {
  if (!env.ETSY_TOKENS) {
    return html('<h1>Cloudflare KV is not configured</h1><p>The <code>ETSY_TOKENS</code> KV binding is missing.</p>', 503);
  }

  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  if (error) {
    return html(`<h1>Etsy authorisation was not completed</h1><p>${escapeHtml(errorDescription || error)}</p>`, 400);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return html('<h1>Invalid Etsy callback</h1><p>Missing OAuth code or state.</p>', 400);

  const verifierKey = `${PKCE_PREFIX}${state}`;
  const verifier = await env.ETSY_TOKENS.get(verifierKey);
  if (!verifier) return html('<h1>OAuth request expired</h1><p>Please start the Etsy connection again.</p>', 400);
  await env.ETSY_TOKENS.delete(verifierKey);

  const keystring = env.ETSY_KEYSTRING || 'hractys6zbhergnu2xrk1bg3';

  try {
    const tokens = await tokenRequest({
      grant_type: 'authorization_code',
      client_id: keystring,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    });

    await saveTokens(env, tokens);
    return html('<h1>Etsy connected successfully</h1><p>Your Brett\'s Flow Art website is now authorised to read your Etsy listings.</p><p><a href="/api/etsy/listings">Test the Etsy listings feed</a></p><p><a href="/shop/">Open the shop page</a></p>');
  } catch (err) {
    console.error('Etsy OAuth callback error:', err);
    return html('<h1>Etsy connection failed</h1><p>The token exchange failed. Check the Worker logs for the Etsy response.</p>', 502);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function handleStatus(env) {
  if (!env.ETSY_TOKENS) return json({ connected: false, code: 'ETSY_KV_MISSING' }, 503);
  const tokens = await getStoredTokens(env);
  return json({
    connected: Boolean(tokens?.refresh_token),
    scope: tokens?.scope || null,
    accessTokenExpiresAt: tokens?.expires_at ? new Date(tokens.expires_at).toISOString() : null,
    hasRefreshToken: Boolean(tokens?.refresh_token),
  }, 200, { 'cache-control': 'no-store' });
}

async function handleEtsyListings(request, env, ctx) {
  const keystring = env.ETSY_KEYSTRING || 'hractys6zbhergnu2xrk1bg3';
  const sharedSecret = env.ETSY_SHARED_SECRET;

  if (!sharedSecret) {
    return json({ error: 'Etsy integration is not configured.', code: 'ETSY_SECRET_MISSING' }, 503);
  }
  if (!env.ETSY_TOKENS) {
    return json({ error: 'Cloudflare KV is not configured.', code: 'ETSY_KV_MISSING' }, 503);
  }

  const cache = caches.default;
  const requestUrl = new URL(request.url);
  const cacheUrl = new URL('/api/etsy/listings?catalogue=v3-oauth', requestUrl.origin);
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const apiKey = `${keystring}:${sharedSecret}`;
    const { accessToken } = await getAccessToken(env, keystring);
    const shop = await getOwnShop(apiKey, accessToken);
    const active = await getAllActiveListings(shop.shop_id, apiKey, accessToken);
    const detailed = await hydrateListings(active, apiKey);

    const detailedById = new Map(detailed.map((item) => [item.listing_id, item]));
    const merged = active.map((item) => ({ ...item, ...(detailedById.get(item.listing_id) || {}) }));

    const listings = merged
      .map((listing) => ({
        id: listing.listing_id,
        title: listing.title,
        url: listing.url,
        price: money(listing.price),
        quantity: listing.quantity,
        tags: Array.isArray(listing.tags) ? listing.tags : [],
        image: firstImage(listing),
        created: listing.created_timestamp || listing.creation_timestamp || 0,
        updated: listing.updated_timestamp || listing.last_modified_timestamp || 0,
      }))
      .filter((listing) => listing.id && listing.title && listing.url)
      .sort((a, b) => b.created - a.created);

    const response = json({
      shop: shop.shop_name || 'BrettsFlowArt',
      shopId: shop.shop_id,
      shopUrl: 'https://brettsflowart.etsy.com',
      etsyReportedActiveCount: Number(shop.listing_active_count || 0),
      count: listings.length,
      listings,
      fetchedAt: new Date().toISOString(),
      source: 'oauth-getListingsByShop',
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error('Etsy catalogue error:', error);
    if (error?.code === 'ETSY_NOT_CONNECTED') {
      return json({
        error: 'Etsy OAuth has not been connected yet.',
        code: 'ETSY_NOT_CONNECTED',
        connectUrl: '/api/etsy/connect',
      }, 503);
    }
    return json({ error: 'Unable to load the Etsy shop right now.', code: 'ETSY_API_ERROR' }, 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/etsy/connect') {
      return handleConnect(env);
    }
    if (request.method === 'GET' && url.pathname === '/api/etsy/callback') {
      return handleCallback(request, env);
    }
    if (request.method === 'GET' && url.pathname === '/api/etsy/status') {
      return handleStatus(env);
    }
    if (request.method === 'GET' && url.pathname === '/api/etsy/listings') {
      return handleEtsyListings(request, env, ctx);
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found.' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
