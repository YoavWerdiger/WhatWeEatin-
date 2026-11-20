import { Dish, Restaurant, RestaurantSource } from '../types';
import { MOCK_RESTAURANTS } from '../utils/mockData';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`[Retry] Attempt ${i + 1}/${retries + 1} failed:`, String(err));
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

function safeJsonParse(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error(`[${label}] JSON parse failed. Length: ${text.length}, Preview: ${text.slice(0, 200)}`);
    throw new Error(`${label}: Invalid JSON response`);
  }
}

/** Wolt prices are in agorot. */
function formatShekels(agorot: number): string {
  const v = agorot / 100;
  return `₪${Number.isInteger(v) ? v : v.toFixed(2)}`;
}

const dishCache = new Map<string, Promise<Dish[]>>();

/**
 * A few dishes with photos from the venue's Wolt menu — fetched only when a card is
 * flipped, and cached per venue for the session.
 */
export function fetchWoltDishes(slug: string, limit = 4): Promise<Dish[]> {
  const cached = dishCache.get(slug);
  if (cached) return cached;
  const url = `https://consumer-api.wolt.com/consumer-api/consumer-assortment/v1/venues/slug/${slug}/assortment`;
  const p = fetchWithTimeout(url, {}, 10_000)
    .then((res) => (res.ok ? res.json() : null))
    .then((json: { items?: { name?: string; price?: number; images?: { url?: string }[] }[] } | null) => {
      const items = json?.items ?? [];
      return items
        .filter((it) => it.name && it.images?.[0]?.url)
        .slice(0, limit)
        .map((it) => ({
          name: it.name as string,
          price: it.price != null ? formatShekels(it.price) : undefined,
          image: it.images?.[0]?.url,
        }));
    })
    .catch(() => {
      dishCache.delete(slug);
      return [];
    });
  dishCache.set(slug, p);
  return p;
}

// ---------------------------------------------------------------------------
// Wolt Provider
// ---------------------------------------------------------------------------

interface WoltRating {
  rating: number;
  score: number;
  volume: number;
}

interface WoltVenue {
  name: string;
  slug: string;
  id: string;
  short_description?: string;
  city?: string;
  address?: string;
  online: boolean;
  delivers: boolean;
  estimate?: number;
  estimate_range?: string;
  rating?: WoltRating;
  price_range?: number;
  tags?: string[];
  venue_preview_items?: { name: string; price?: number; image?: { url?: string } }[];
}

function woltScoreTo5(score: number | undefined): number {
  if (!score) return 4.0;
  return Math.round((score / 2) * 10) / 10;
}

function inferWoltCuisine(tags?: string[]): string {
  if (!tags?.length) return 'Restaurant';
  return tags[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchFromWolt(lat: number, lon: number): Promise<Restaurant[]> {
  const url = `https://restaurant-api.wolt.com/v1/pages/restaurants?lat=${lat}&lon=${lon}`;
  console.log('[Wolt] Fetching:', url);

  const res = await fetchWithTimeout(url, {
    headers: { Accept: 'application/json' },
  });
  console.log('[Wolt] Status:', res.status, 'Content-Type:', res.headers.get('content-type'));
  if (!res.ok) throw new Error(`Wolt API ${res.status}`);

  const text = await res.text();
  console.log('[Wolt] Response size:', text.length, 'chars');

  if (text.length < 100) {
    console.warn('[Wolt] Response too short:', text.slice(0, 100));
    throw new Error('Wolt: Empty or invalid response');
  }

  const data = safeJsonParse(text, 'Wolt') as Record<string, unknown>;

  const citySlug: string =
    (data.city_data as Record<string, string>)?.slug?.toLowerCase().replace(/ /g, '-') ||
    (data.city as string) ||
    'tel-aviv';

  const sections = (data.sections || []) as Array<{ name: string; items?: Array<Record<string, unknown>> }>;
  const sectionNames = sections.map((s) => s.name);
  console.log('[Wolt] Sections found:', JSON.stringify(sectionNames));

  // Try multiple strategies to find the venue section
  let venuesSection = sections.find(
    (s) => s.name?.includes('venues') || s.name?.includes('restaurants'),
  );

  // Fallback: use largest section with items that have venue data
  if (!venuesSection) {
    venuesSection = sections
      .filter((s) => (s.items?.length || 0) > 10)
      .sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0))[0];
    if (venuesSection) {
      console.log('[Wolt] Using fallback section:', venuesSection.name);
    }
  }

  if (!venuesSection) {
    console.warn('[Wolt] No venue section found in:', JSON.stringify(sectionNames));
    return [];
  }

  const items = venuesSection.items || [];
  console.log('[Wolt] Section:', venuesSection.name, 'Items:', items.length);

  const restaurants: Restaurant[] = [];
  let skippedNoVenue = 0;
  let skippedNoImage = 0;

  for (const item of items) {
    const v = item.venue as WoltVenue | undefined;
    const img = item.image as { url?: string; blurhash?: string } | undefined;

    if (!v) { skippedNoVenue++; continue; }
    if (!img?.url) { skippedNoImage++; continue; }

    restaurants.push({
      id: `wolt-${v.slug}`,
      name: v.name,
      // Card-sized from Wolt's image proxy instead of the full original
      image: img.url.includes('?') ? img.url : `${img.url}?w=900`,
      rating: woltScoreTo5(v.rating?.score),
      reviewCount: v.rating?.volume || 0,
      deliveryTime: v.estimate_range
        ? `${v.estimate_range} min`
        : v.estimate
          ? `${v.estimate} min`
          : '25-40 min',
      priceLevel: (v.price_range || 2) as 1 | 2 | 3 | 4,
      cuisine: inferWoltCuisine(v.tags),
      address: v.address || undefined,
      isOpen: v.online && v.delivers,
      source: 'wolt',
      slug: v.slug,
      externalUrl: `https://wolt.com/en/isr/${citySlug}/restaurant/${v.slug}`,
      blurhash: img.blurhash || undefined,
      description: v.short_description || undefined,
      tags: v.tags?.length ? v.tags : undefined,
      dishes: v.venue_preview_items?.length
        ? v.venue_preview_items.slice(0, 4).map((d) => ({
            name: d.name,
            price: d.price != null ? formatShekels(d.price) : undefined,
            image: d.image?.url,
          }))
        : undefined,
    });
  }

  console.log(`[Wolt] Parsed ${restaurants.length} restaurants (skipped: ${skippedNoVenue} no venue, ${skippedNoImage} no image)`);
  return restaurants;
}

// ---------------------------------------------------------------------------
// 10bis Provider
// ---------------------------------------------------------------------------

const TENBIS_CITY_MAP: Record<string, number> = {
  'תל אביב': 24,
  'תל אביב-יפו': 24,
  'tel aviv': 24,
  'tel aviv-yafo': 24,
  'ירושלים': 1,
  jerusalem: 1,
  'חיפה': 4,
  haifa: 4,
  'באר שבע': 7,
  'beer sheva': 7,
  'ראשון לציון': 6,
  'rishon lezion': 6,
  'פתח תקווה': 19,
  'petah tikva': 19,
  'נתניה': 16,
  netanya: 16,
  'הרצליה': 27,
  herzliya: 27,
  'רמת גן': 8,
  'ramat gan': 8,
  'אשדוד': 20,
  ashdod: 20,
  'רחובות': 18,
  rehovot: 18,
  'כפר סבא': 12,
  'kfar saba': 12,
  'רעננה': 22,
  raanana: 22,
  'הוד השרון': 36,
  'hod hasharon': 36,
  'מודיעין': 200,
  "modi'in": 200,
  'גבעתיים': 9,
  givatayim: 9,
  'בני ברק': 5,
  'bnei brak': 5,
};

function resolveTenBisCityId(cityName?: string): number {
  if (!cityName) return 24;
  const normalized = cityName.toLowerCase().trim();
  for (const [key, id] of Object.entries(TENBIS_CITY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return id;
  }
  return 24;
}

interface TenBisRestaurant {
  restaurantId: number;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantCityName?: string;
  restaurantLogoUrl?: string;
  profileImageUrl?: string;
  restaurantHeaderImageUrl?: string;
  deliveryFee?: number;
  deliveryFeeAmount?: number;
  minimumPriceForOrder?: number;
  distanceFromUser?: number;
  isOpenNow?: boolean;
  isActive?: boolean;
  reviewsRank?: number;
  numOfReviews?: number;
  restaurantCuisineTypes?: Record<string, string>;
  deliveryTimeInMinutes?: number;
  deliveryTimeStr?: string;
  isKosher?: boolean;
  kosherString?: string;
}

function tenBisRatingTo5(rank: number | undefined): number {
  if (!rank) return 4.0;
  return Math.round(Math.min(rank / 2, 5) * 10) / 10;
}

function inferTenBisCuisine(cuisines?: Record<string, string>): string {
  if (!cuisines) return 'Restaurant';
  const values = Object.values(cuisines);
  return values[0] || 'Restaurant';
}

async function fetchFromTenBis(
  lat: number,
  lon: number,
  cityName?: string,
): Promise<Restaurant[]> {
  const cityId = resolveTenBisCityId(cityName);
  console.log('[10bis] cityName:', cityName, 'cityId:', cityId, 'lat:', lat, 'lon:', lon);

  const params = new URLSearchParams({
    addressId: '0',
    cityId: String(cityId),
    streetId: '0',
    latitude: String(lat),
    longitude: String(lon),
    deliveryMethod: 'Delivery',
  });

  const url = `https://www.10bis.co.il/NextApi/SearchRestaurants?${params}`;
  console.log('[10bis] Fetching:', url);

  const res = await fetchWithTimeout(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    },
  });
  console.log('[10bis] Status:', res.status);
  if (!res.ok) throw new Error(`10bis API ${res.status}`);

  const text = await res.text();
  console.log('[10bis] Response size:', text.length, 'chars');

  const data = safeJsonParse(text, '10bis') as Record<string, unknown>;
  const dataField = data?.Data as Record<string, unknown> | undefined;

  // Try different field names for restaurant list
  const list: TenBisRestaurant[] =
    (dataField?.restaurantsList as TenBisRestaurant[]) ||
    (dataField?.RestaurantsList as TenBisRestaurant[]) ||
    [];

  console.log('[10bis] Success:', (data as Record<string, unknown>)?.Success, 'List count:', list.length);

  if (list.length === 0) {
    const keys = dataField ? Object.keys(dataField) : Object.keys(data);
    console.warn('[10bis] Empty list. Data keys:', JSON.stringify(keys));
  }

  return list
    .filter((r) => r.isActive !== false)
    .filter((r) => r.profileImageUrl || r.restaurantLogoUrl)
    .map(
      (r): Restaurant => ({
        id: `tenbis-${r.restaurantId}`,
        name: r.restaurantName,
        image: r.profileImageUrl || r.restaurantLogoUrl || '',
        rating: tenBisRatingTo5(r.reviewsRank),
        reviewCount: r.numOfReviews || 0,
        deliveryTime:
          r.deliveryTimeInMinutes
            ? `${r.deliveryTimeInMinutes} min`
            : r.deliveryTimeStr || '30-45 min',
        priceLevel:
          r.minimumPriceForOrder && r.minimumPriceForOrder > 80 ? 3 : 2,
        cuisine: inferTenBisCuisine(r.restaurantCuisineTypes),
        address: r.restaurantAddress,
        distance:
          r.distanceFromUser != null
            ? `${(r.distanceFromUser / 1000).toFixed(1)} km`
            : undefined,
        isOpen: r.isOpenNow ?? true,
        source: 'tenbis',
        deliveryFee:
          r.deliveryFee != null && r.deliveryFee > 0
            ? `₪${r.deliveryFee}`
            : r.deliveryFee === 0
              ? 'Free'
              : undefined,
        minimumOrder:
          r.minimumPriceForOrder != null
            ? `₪${r.minimumPriceForOrder}`
            : undefined,
        externalUrl: `https://www.10bis.co.il/next/restaurants/menu/delivery/${r.restaurantId}`,
        tags: r.restaurantCuisineTypes ? Object.values(r.restaurantCuisineTypes).filter(Boolean) : undefined,
        description: r.isKosher && r.kosherString ? r.kosherString : undefined,
      }),
    );
}

// ---------------------------------------------------------------------------
// Google Places Provider (needs API key)
// ---------------------------------------------------------------------------

interface GooglePlaceResult {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: { photo_reference: string }[];
  geometry: { location: { lat: number; lng: number } };
  vicinity?: string;
  opening_hours?: { open_now: boolean };
  types?: string[];
}

function getPhotoUrl(ref: string): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${ref}&key=${GOOGLE_PLACES_API_KEY}`;
}

function inferGoogleCuisine(types?: string[]): string {
  if (!types) return 'Restaurant';
  const map: Record<string, string> = {
    bakery: 'Bakery',
    bar: 'Bar',
    cafe: 'Cafe',
    meal_delivery: 'Delivery',
    meal_takeaway: 'Takeaway',
  };
  for (const t of types) if (map[t]) return map[t];
  return 'Restaurant';
}

async function fetchFromGoogle(
  lat: number,
  lon: number,
): Promise<Restaurant[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.log('[Google] No API key, skipping');
    return [];
  }

  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lon}&radius=2000&type=restaurant&key=${GOOGLE_PLACES_API_KEY}`;

  const res = await fetchWithTimeout(url);
  const text = await res.text();
  const data = safeJsonParse(text, 'Google') as Record<string, unknown>;

  if (data.status !== 'OK') {
    console.log('[Google] Status:', data.status);
    return [];
  }

  return (data.results as GooglePlaceResult[])
    .filter((p) => p.photos?.length)
    .map(
      (p): Restaurant => ({
        id: `google-${p.place_id}`,
        name: p.name,
        image: p.photos?.[0]
          ? getPhotoUrl(p.photos[0].photo_reference)
          : MOCK_RESTAURANTS[0].image,
        rating: p.rating || 4.0,
        reviewCount: p.user_ratings_total || 0,
        deliveryTime: '25-45 min',
        priceLevel: Math.max(1, Math.min(4, p.price_level || 2)) as 1 | 2 | 3 | 4,
        cuisine: inferGoogleCuisine(p.types),
        address: p.vicinity,
        isOpen: p.opening_hours?.open_now,
        source: 'google',
      }),
    );
}

// ---------------------------------------------------------------------------
// Merge & Deduplicate
// ---------------------------------------------------------------------------

function normalizeForDedup(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]/g, '')
    .trim();
}

function deduplicateRestaurants(all: Restaurant[]): Restaurant[] {
  const sourcePriority: Record<RestaurantSource, number> = {
    wolt: 0,
    tenbis: 1,
    google: 2,
    mock: 3,
  };

  const seen = new Map<string, Restaurant>();

  const sorted = [...all].sort(
    (a, b) => sourcePriority[a.source] - sourcePriority[b.source],
  );

  for (const r of sorted) {
    const key = normalizeForDedup(r.name);
    if (!seen.has(key)) {
      seen.set(key, r);
    }
  }

  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchAllRestaurants(
  lat: number,
  lon: number,
  cityName?: string,
): Promise<Restaurant[]> {
  console.log(`[Restaurants] Fetching for lat=${lat}, lon=${lon}, city=${cityName}`);

  const results = await Promise.allSettled([
    withRetry(() => fetchFromWolt(lat, lon)),
    withRetry(() => fetchFromTenBis(lat, lon, cityName)),
    withRetry(() => fetchFromGoogle(lat, lon)),
  ]);

  const allRestaurants: Restaurant[] = [];
  const sourceStatus: Record<string, string> = {};

  for (const [i, result] of results.entries()) {
    const name = ['Wolt', '10bis', 'Google'][i];
    if (result.status === 'fulfilled') {
      allRestaurants.push(...result.value);
      sourceStatus[name] = `${result.value.length} results`;
    } else {
      sourceStatus[name] = `failed: ${result.reason}`;
    }
  }

  console.log('[Restaurants] Sources:', JSON.stringify(sourceStatus));

  if (allRestaurants.length === 0) {
    console.warn('[Restaurants] All sources returned 0 results — using mock data');
    return [...MOCK_RESTAURANTS].sort(() => Math.random() - 0.5);
  }

  const deduped = deduplicateRestaurants(allRestaurants);
  console.log(`[Restaurants] Total: ${allRestaurants.length}, After dedup: ${deduped.length}`);

  return deduped
    .filter((r) => r.isOpen !== false)
    .sort(() => Math.random() - 0.5);
}

export { fetchFromWolt, fetchFromTenBis, fetchFromGoogle };
