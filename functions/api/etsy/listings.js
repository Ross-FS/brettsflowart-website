const ETSY_API = 'https://openapi.etsy.com/v3/application';
const SHOP_NAME = 'BrettsFlowArt';
const PAGE_SIZE = 100;
const CACHE_SECONDS = 900;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200
        ? `public, max-age=300, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=3600`
        : 'no-store',
      ...extraHeaders,
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

async function etsyFetch(path, apiKey, init = {}) {
  const response = await fetch(`${ETSY_API}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'x-api-key': apiKey,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Etsy API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function findShopId(apiKey) {
  const data = await etsyFetch(`/shops?shop_name=${encodeURIComponent(SHOP_NAME)}&limit=25`, apiKey);
  const exact = (data.results || []).find(
    (shop) => String(shop.shop_name || '').toLowerCase() === SHOP_NAME.toLowerCase(),
  );
  if (!exact?.shop_id) throw new Error(`Could not find Etsy shop ${SHOP_NAME}`);
  return exact.shop_id;
}

async function getAllActiveListingIds(shopId, apiKey) {
  const all = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const data = await etsyFetch(
      `/shops/${shopId}/listings/active?limit=${PAGE_SIZE}&offset=${offset}`,
      apiKey,
    );
    total = Number(data.count || 0);
    const page = data.results || [];
    all.push(...page);
    if (page.length === 0) break;
    offset += page.length;
  }
  return all;
}

async function hydrateListings(listings, apiKey) {
  const results = [];
  for (let i = 0; i < listings.length; i += PAGE_SIZE) {
    const ids = listings.slice(i, i + PAGE_SIZE).map((listing) => listing.listing_id);
    const params = new URLSearchParams({
      listing_ids: ids.join(','),
      includes: 'Images',
    });
    const data = await etsyFetch(`/listings/batch?${params.toString()}`, apiKey);
    results.push(...(data.results || []));
  }
  return results;
}

export async function onRequestGet(context) {
  const keystring = context.env.ETSY_KEYSTRING || 'hractys6zbhergnu2xrk1bg3';
  const sharedSecret = context.env.ETSY_SHARED_SECRET;
  if (!sharedSecret) {
    return json({ error: 'Etsy integration is not configured.' }, 503);
  }

  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/etsy/listings?catalogue=v1', context.request.url), {
    method: 'GET',
  });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const apiKey = `${keystring}:${sharedSecret}`;
    const shopId = await findShopId(apiKey);
    const active = await getAllActiveListingIds(shopId, apiKey);
    const detailed = await hydrateListings(active, apiKey);

    const listings = detailed
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
      shop: SHOP_NAME,
      shopUrl: 'https://brettsflowart.etsy.com',
      count: listings.length,
      listings,
      fetchedAt: new Date().toISOString(),
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error('Etsy catalogue error', error);
    return json({ error: 'Unable to load the Etsy shop right now.' }, 502);
  }
}
