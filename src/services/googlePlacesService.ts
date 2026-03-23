import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";
import { Restaurant } from "../domain/types.js";

interface FetchRestaurantsParams {
  lat: number;
  lng: number;
  radiusKm: number;
  budgetLevel: number;
  cuisinePreferences?: string[];
}

interface PlacesNearbyResponse {
  results: Array<{
    place_id: string;
    name: string;
    rating?: number;
    price_level?: number;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
    photos?: Array<{
      photo_reference: string;
    }>;
    types?: string[];
    vicinity?: string;
  }>;
}

const mockRestaurants: Restaurant[] = [
  {
    id: uuidv4(),
    externalId: "mock_place_1",
    name: "Pizza Shuk TLV",
    cuisineTags: ["pizza", "italian"],
    rating: 4.6,
    priceLevel: 2,
    lat: 32.0728,
    lng: 34.7792,
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
  },
  {
    id: uuidv4(),
    externalId: "mock_place_2",
    name: "Sushi Corner",
    cuisineTags: ["sushi", "japanese"],
    rating: 4.4,
    priceLevel: 3,
    lat: 32.0772,
    lng: 34.7861,
    imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c",
  },
  {
    id: uuidv4(),
    externalId: "mock_place_3",
    name: "Hummus Brothers",
    cuisineTags: ["middle_eastern", "hummus"],
    rating: 4.7,
    priceLevel: 1,
    lat: 32.0699,
    lng: 34.7718,
    imageUrl: "https://images.unsplash.com/photo-1543087903-1ac2ec7aa8e7",
  },
];

function toPhotoUrl(photoReference?: string): string | undefined {
  if (!photoReference || !env.GOOGLE_PLACES_API_KEY) {
    return undefined;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photoReference}&key=${env.GOOGLE_PLACES_API_KEY}`;
}

function estimateDistanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const R = 6371e3;
  const phi1 = (fromLat * Math.PI) / 180;
  const phi2 = (toLat * Math.PI) / 180;
  const dPhi = ((toLat - fromLat) * Math.PI) / 180;
  const dLambda = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export class GooglePlacesService {
  async fetchRestaurants(params: FetchRestaurantsParams): Promise<Restaurant[]> {
    if (!env.GOOGLE_PLACES_API_KEY) {
      return mockRestaurants.map((restaurant) => ({
        ...restaurant,
        distanceMeters: estimateDistanceMeters(params.lat, params.lng, restaurant.lat, restaurant.lng),
        etaMinutes: Math.max(10, Math.round((restaurant.distanceMeters ?? 1500) / 150)),
      }));
    }

    const radiusMeters = Math.min(Math.max(params.radiusKm * 1000, 500), 10000);
    const keyword = params.cuisinePreferences?.length ? params.cuisinePreferences.join("|") : "restaurant";
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${params.lat},${params.lng}`);
    url.searchParams.set("radius", `${radiusMeters}`);
    url.searchParams.set("type", "restaurant");
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("key", env.GOOGLE_PLACES_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Google Places request failed with status ${response.status}`);
    }

    const data = (await response.json()) as PlacesNearbyResponse;
    return (data.results ?? []).slice(0, 40).map((place) => {
      const lat = place.geometry?.location?.lat ?? params.lat;
      const lng = place.geometry?.location?.lng ?? params.lng;
      const distanceMeters = estimateDistanceMeters(params.lat, params.lng, lat, lng);
      const priceLevel = place.price_level ?? params.budgetLevel;
      return {
        id: uuidv4(),
        externalId: place.place_id,
        name: place.name,
        cuisineTags: place.types ?? ["restaurant"],
        rating: place.rating ?? 3.8,
        priceLevel,
        lat,
        lng,
        imageUrl: toPhotoUrl(place.photos?.[0]?.photo_reference),
        distanceMeters,
        etaMinutes: Math.max(10, Math.round(distanceMeters / 150)),
      };
    });
  }
}
