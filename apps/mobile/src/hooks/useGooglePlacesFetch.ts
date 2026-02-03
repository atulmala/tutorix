/**
 * Google Places API via fetch (no native SDK).
 * Uses GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY from .env (inlined at build time via babel).
 */
const API_KEY =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  '';

export interface PlacePrediction {
  description: string;
  placeId: string;
  secondaryText?: string;
}

export interface LocationSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

function getComponent(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  type: string,
  useShort = false
): string | undefined {
  const comp = components.find((c) => c.types.includes(type));
  return comp ? (useShort ? comp.short_name : comp.long_name) : undefined;
}

export async function getPlacePredictions(
  input: string
): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (!API_KEY) {
    console.log('[Places] getPlacePredictions: no API_KEY, skipping');
    return [];
  }
  if (trimmed.length < 2) {
    console.log('[Places] getPlacePredictions: input too short (< 2 chars)');
    return [];
  }

  const params = new URLSearchParams({
    input: trimmed,
    key: API_KEY,
    types: 'geocode',
  });
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;

  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status?: string;
      error_message?: string;
      predictions?: Array<{
        description?: string;
        place_id?: string;
        structured_formatting?: { secondary_text?: string };
      }>;
    };

    console.log('[Places] API response:', {
      status: json.status,
      error_message: json.error_message,
      predictionsCount: json.predictions?.length ?? 0,
    });

    if (json.status !== 'OK' || !json.predictions?.length) {
      return [];
    }

    const results = json.predictions.map((p) => ({
      description: p.description || '',
      placeId: p.place_id || '',
      secondaryText: p.structured_formatting?.secondary_text,
    }));
    console.log('[Places] returning', results.length, 'suggestions');
    return results;
  } catch (err) {
    console.log('[Places] getPlacePredictions error:', err);
    return [];
  }
}

export async function getPlaceDetails(
  placeId: string
): Promise<LocationSuggestion | null> {
  if (!API_KEY) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    fields: 'address_components,formatted_address,geometry',
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;

  const res = await fetch(url);
  const json = (await res.json()) as {
    status?: string;
    result?: {
      formatted_address?: string;
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
      geometry?: { location?: { lat: number; lng: number } };
    };
  };

  if (json.status !== 'OK' || !json.result) return null;
  const r = json.result;

  const components = r.address_components || [];
  const city =
    getComponent(components, 'locality') ||
    getComponent(components, 'administrative_area_level_2') ||
    getComponent(components, 'sublocality') ||
    getComponent(components, 'postal_town');
  const state = getComponent(components, 'administrative_area_level_1');
  const country = getComponent(components, 'country');
  const postalCode =
    getComponent(components, 'postal_code') ||
    getComponent(components, 'postal_code', true);

  const loc = r.geometry?.location;
  const lat = loc?.lat ?? 0;
  const lng = loc?.lng ?? 0;

  return {
    displayName: r.formatted_address ?? '',
    latitude: lat,
    longitude: lng,
    city,
    state,
    country,
    postalCode,
  };
}
