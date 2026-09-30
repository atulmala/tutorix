/**
 * Google Places API via fetch (no native SDK).
 * Uses GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY from .env (inlined at build time via babel).
 */
import {
  cityNameFromAddressComponents,
  LOCALITY_SEARCH_RADIUS_M,
  postalCodeFromAddressComponents,
  type SelectedCity,
} from '@tutorix/shared-utils';

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

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function getComponent(
  components: AddressComponent[],
  type: string,
  useShort = false,
): string | undefined {
  const comp = components.find((c) => c.types.includes(type));
  return comp ? (useShort ? comp.short_name : comp.long_name) : undefined;
}

/** RN/Hermes-safe query builder without URLSearchParams. */
function buildQueryString(entries: Array<[string, string]>): string {
  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

async function fetchPredictions(
  queryEntries: Array<[string, string]>,
): Promise<PlacePrediction[]> {
  if (!API_KEY) {
    return [];
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${buildQueryString(queryEntries)}`;

  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status?: string;
      predictions?: Array<{
        description?: string;
        place_id?: string;
        structured_formatting?: { secondary_text?: string };
      }>;
    };

    if (json.status !== 'OK' || !json.predictions?.length) {
      return [];
    }

    return json.predictions.map((p) => ({
      description: p.description || '',
      placeId: p.place_id || '',
      secondaryText: p.structured_formatting?.secondary_text,
    }));
  } catch {
    return [];
  }
}

export async function getCityPredictions(
  input: string,
  options?: { countryCode?: string },
): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const queryEntries: Array<[string, string]> = [
    ['input', trimmed],
    ['key', API_KEY],
    ['types', '(cities)'],
  ];
  if (options?.countryCode) {
    queryEntries.push(['components', `country:${options.countryCode}`]);
  }
  return fetchPredictions(queryEntries);
}

export async function getPlacePredictions(
  input: string,
  options?: { countryCode?: string; nearCity?: SelectedCity },
): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const queryEntries: Array<[string, string]> = [
    ['input', trimmed],
    ['key', API_KEY],
    ['types', 'geocode'],
  ];
  if (options?.countryCode) {
    queryEntries.push(['components', `country:${options.countryCode}`]);
  }
  if (options?.nearCity) {
    queryEntries.push([
      'location',
      `${options.nearCity.latitude},${options.nearCity.longitude}`,
    ]);
    queryEntries.push(['radius', String(LOCALITY_SEARCH_RADIUS_M)]);
  }
  return fetchPredictions(queryEntries);
}

export async function getSelectedCityFromPlaceId(
  placeId: string,
): Promise<SelectedCity | null> {
  if (!API_KEY) {
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${buildQueryString([
    ['place_id', placeId],
    ['key', API_KEY],
    ['fields', 'address_components,geometry,name'],
  ])}`;

  const res = await fetch(url);
  const json = (await res.json()) as {
    status?: string;
    result?: {
      name?: string;
      address_components?: AddressComponent[];
      geometry?: { location?: { lat: number; lng: number } };
    };
  };

  if (json.status !== 'OK' || !json.result?.geometry?.location) {
    return null;
  }

  const components = json.result.address_components ?? [];
  const name =
    cityNameFromAddressComponents(components) ||
    json.result.name ||
    '';

  if (!name) {
    return null;
  }

  return {
    name,
    placeId,
    latitude: json.result.geometry.location.lat,
    longitude: json.result.geometry.location.lng,
    state: getComponent(components, 'administrative_area_level_1'),
    country: getComponent(components, 'country'),
  };
}

export async function reverseGeocodePostalCode(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  if (!API_KEY || !latitude || !longitude) {
    return undefined;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?${buildQueryString([
    ['latlng', `${latitude},${longitude}`],
    ['key', API_KEY],
    ['result_type', 'postal_code'],
  ])}`;

  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status?: string;
      results?: Array<{ address_components?: AddressComponent[] }>;
    };

    if (json.status !== 'OK' || !json.results?.length) {
      return reverseGeocodePostalCodeBroad(latitude, longitude);
    }

    for (const result of json.results) {
      const pin = postalCodeFromAddressComponents(result.address_components ?? []);
      if (pin) {
        return pin;
      }
    }

    return reverseGeocodePostalCodeBroad(latitude, longitude);
  } catch {
    return undefined;
  }
}

async function reverseGeocodePostalCodeBroad(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  if (!API_KEY) {
    return undefined;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?${buildQueryString([
    ['latlng', `${latitude},${longitude}`],
    ['key', API_KEY],
  ])}`;

  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status?: string;
      results?: Array<{ address_components?: AddressComponent[] }>;
    };

    if (json.status !== 'OK' || !json.results?.length) {
      return undefined;
    }

    for (const result of json.results) {
      const pin = postalCodeFromAddressComponents(result.address_components ?? []);
      if (pin) {
        return pin;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function getPlaceDetails(
  placeId: string,
): Promise<LocationSuggestion | null> {
  if (!API_KEY) {
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${buildQueryString([
    ['place_id', placeId],
    ['key', API_KEY],
    ['fields', 'address_components,formatted_address,geometry'],
  ])}`;

  const res = await fetch(url);
  const json = (await res.json()) as {
    status?: string;
    result?: {
      formatted_address?: string;
      address_components?: AddressComponent[];
      geometry?: { location?: { lat: number; lng: number } };
    };
  };

  if (json.status !== 'OK' || !json.result) {
    return null;
  }
  const r = json.result;

  const components = r.address_components || [];
  const city =
    getComponent(components, 'locality') ||
    getComponent(components, 'administrative_area_level_2') ||
    getComponent(components, 'sublocality') ||
    getComponent(components, 'postal_town');
  const state = getComponent(components, 'administrative_area_level_1');
  const country = getComponent(components, 'country');
  let postalCode = postalCodeFromAddressComponents(components);

  const loc = r.geometry?.location;
  const lat = loc?.lat ?? 0;
  const lng = loc?.lng ?? 0;

  if (!postalCode && lat && lng) {
    postalCode = await reverseGeocodePostalCode(lat, lng);
  }

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
