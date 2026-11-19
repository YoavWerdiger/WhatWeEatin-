import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<UserLocation | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;

    let city: string | undefined;
    try {
      const [geocode] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode) {
        city = geocode.city || geocode.subregion || geocode.region || undefined;
      }
    } catch {
      // Geocoding may fail — non-critical
    }

    return { latitude, longitude, city };
  } catch (error) {
    console.warn('Failed to get location:', error);
    return null;
  }
}

// Tel Aviv default for demo/fallback
export const DEFAULT_LOCATION: UserLocation = {
  latitude: 32.0853,
  longitude: 34.7818,
  city: 'Tel Aviv',
};

// Israel approximate bounding box
function isInIsrael(lat: number, lon: number): boolean {
  return lat >= 29.5 && lat <= 33.3 && lon >= 34.2 && lon <= 35.9;
}

export function ensureIsraeliLocation(location: UserLocation | null): UserLocation {
  if (!location) return DEFAULT_LOCATION;
  if (!isInIsrael(location.latitude, location.longitude)) {
    console.log(
      `[Location] ${location.city || 'Unknown'} (${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}) is outside Israel — using Tel Aviv`,
    );
    return DEFAULT_LOCATION;
  }
  return location;
}
