import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cityNameFromAddressComponents,
  LOCALITY_SEARCH_RADIUS_M,
  type SelectedCity,
} from '@tutorix/shared-utils';
import {
  loadGoogleMaps,
  type GoogleMapsApi,
} from '../lib/google-maps-loader';

interface Prediction {
  description: string;
  placeId: string;
  secondaryText?: string;
}

interface RawPlacePrediction {
  description?: string;
  place_id?: string;
  structured_formatting?: { secondary_text?: string };
}

type AutocompleteServiceInstance = InstanceType<
  GoogleMapsApi['maps']['places']['AutocompleteService']
>;
type PlacesServiceInstance = InstanceType<
  GoogleMapsApi['maps']['places']['PlacesService']
>;

interface GetPredictionsOptions {
  nearCity?: SelectedCity;
}

interface UseGooglePlacesAutocompleteResult {
  ready: boolean;
  error: string | null;
  getCityPredictions: (input: string) => Promise<Prediction[]>;
  getPredictions: (
    input: string,
    options?: GetPredictionsOptions,
  ) => Promise<Prediction[]>;
  getSelectedCityFromPlaceId: (placeId: string) => Promise<SelectedCity | null>;
  getPlaceDetails: (placeId: string) => Promise<unknown>;
}

function mapRawPredictions(raw: RawPlacePrediction[]): Prediction[] {
  return raw.map((p) => ({
    description: (p.description ?? '') as string,
    placeId: (p.place_id ?? '') as string,
    secondaryText: p.structured_formatting?.secondary_text as string | undefined,
  }));
}

function autocompletePredictions(
  svc: AutocompleteServiceInstance,
  request: object,
): Promise<Prediction[]> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (results: Prediction[]) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(results);
    };

    const timer = window.setTimeout(() => finish([]), 10_000);

    try {
      svc.getPlacePredictions(
        request,
        (predictions: unknown[] | null, status: string) => {
          window.clearTimeout(timer);
          if (status === 'OK' && predictions?.length) {
            finish(mapRawPredictions(predictions as RawPlacePrediction[]));
            return;
          }
          finish([]);
        },
      );
    } catch {
      window.clearTimeout(timer);
      finish([]);
    }
  });
}

export function useGooglePlacesAutocomplete(): UseGooglePlacesAutocompleteResult {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoServiceRef = useRef<AutocompleteServiceInstance | null>(null);
  const detailsServiceRef = useRef<PlacesServiceInstance | null>(null);
  const googleRef = useRef<GoogleMapsApi | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled) return;
        googleRef.current = google;
        autoServiceRef.current = new google.maps.places.AutocompleteService();
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load Google Maps',
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getPlacesService = useCallback((): PlacesServiceInstance | null => {
    const google = googleRef.current;
    if (!google) {
      return null;
    }
    if (!detailsServiceRef.current) {
      const dummy = document.createElement('div');
      detailsServiceRef.current = new google.maps.places.PlacesService(dummy);
    }
    return detailsServiceRef.current;
  }, []);

  const getCityPredictions = useCallback((input: string): Promise<Prediction[]> => {
    const svc = autoServiceRef.current;
    if (!svc || !input.trim()) {
      return Promise.resolve([]);
    }

    return autocompletePredictions(svc, {
      input,
      types: ['(cities)'],
      componentRestrictions: { country: 'in' },
    });
  }, []);

  const getPredictions = useCallback(
    async (
      input: string,
      options?: GetPredictionsOptions,
    ): Promise<Prediction[]> => {
      const svc = autoServiceRef.current;
      const google = googleRef.current;
      if (!svc || !input.trim()) {
        return [];
      }

      const baseRequest = {
        input,
        types: ['geocode'],
        componentRestrictions: { country: 'in' },
      };

      const nearCity = options?.nearCity;
      if (
        nearCity &&
        google?.maps?.LatLng &&
        nearCity.latitude !== 0 &&
        nearCity.longitude !== 0
      ) {
        const biasedRequest = {
          ...baseRequest,
          location: new google.maps.LatLng(
            nearCity.latitude,
            nearCity.longitude,
          ),
          radius: LOCALITY_SEARCH_RADIUS_M,
        };

        const biased = await autocompletePredictions(svc, biasedRequest);
        if (biased.length > 0) {
          return biased;
        }

        return autocompletePredictions(svc, {
          ...baseRequest,
          input: `${input}, ${nearCity.name}`,
        });
      }

      return autocompletePredictions(svc, baseRequest);
    },
    [],
  );

  const getSelectedCityFromPlaceId = useCallback(
    (placeId: string): Promise<SelectedCity | null> => {
      const svc = getPlacesService();
      if (!svc) {
        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        svc.getDetails(
          {
            placeId,
            fields: ['address_components', 'geometry', 'name'],
          },
          (place: unknown, status: string) => {
            if (status !== 'OK' || !place) {
              resolve(null);
              return;
            }
            const p = place as {
              name?: string;
              address_components?: Array<{
                long_name: string;
                short_name: string;
                types: string[];
              }>;
              geometry?: {
                location?: { lat: () => number; lng: () => number };
              };
            };
            const components = p.address_components ?? [];
            const location = p.geometry?.location;
            if (!location) {
              resolve(null);
              return;
            }
            const name =
              cityNameFromAddressComponents(components) || p.name || '';
            if (!name) {
              resolve(null);
              return;
            }
            const state = components.find((c) =>
              c.types.includes('administrative_area_level_1'),
            )?.long_name;
            const country = components.find((c) =>
              c.types.includes('country'),
            )?.long_name;
            resolve({
              name,
              placeId,
              latitude: location.lat(),
              longitude: location.lng(),
              state,
              country,
            });
          },
        );
      });
    },
    [getPlacesService],
  );

  const getPlaceDetails = useCallback(
    (placeId: string): Promise<unknown> => {
      const svc = getPlacesService();
      if (!svc) {
        return Promise.reject(new Error('PlacesService is not ready'));
      }

      return new Promise((resolve, reject) => {
        svc.getDetails(
          {
            placeId,
            fields: ['formatted_address', 'geometry', 'address_components'],
          },
          (place: unknown, status: string) => {
            if (status !== 'OK' || !place) {
              reject(new Error('Failed to fetch place details'));
              return;
            }
            resolve(place);
          },
        );
      });
    },
    [getPlacesService],
  );

  return {
    ready,
    error,
    getCityPredictions,
    getPredictions,
    getSelectedCityFromPlaceId,
    getPlaceDetails,
  };
};
