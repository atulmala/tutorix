import { useCallback, useEffect, useRef, useState } from 'react';
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

interface UseGooglePlacesAutocompleteResult {
  ready: boolean;
  error: string | null;
  getPredictions: (input: string) => Promise<Prediction[]>;
  getPlaceDetails: (placeId: string) => Promise<unknown>;
}

export function useGooglePlacesAutocomplete(): UseGooglePlacesAutocompleteResult {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoServiceRef = useRef<AutocompleteServiceInstance | null>(null);
  const detailsServiceRef = useRef<PlacesServiceInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled) return;
        autoServiceRef.current = new google.maps.places.AutocompleteService();
        const dummy = document.createElement('div');
        detailsServiceRef.current = new google.maps.places.PlacesService(dummy);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load Google Maps'
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getPredictions = useCallback((input: string): Promise<Prediction[]> => {
    const svc = autoServiceRef.current;
    if (!svc) {
      return Promise.resolve([]);
    }

    return new Promise((resolve) => {
      svc.getPlacePredictions(
        {
          input,
          types: ['geocode'],
        },
        (predictions: unknown[] | null, status: string) => {
          if (status !== 'OK' || !predictions || !predictions.length) {
            resolve([]);
            return;
          }
          const raw = predictions as RawPlacePrediction[];
          resolve(
            raw.map((p) => ({
              description: (p.description ?? '') as string,
              placeId: (p.place_id ?? '') as string,
              secondaryText: p.structured_formatting?.secondary_text as
                | string
                | undefined,
            }))
          );
        }
      );
    });
  }, []);

  const getPlaceDetails = useCallback((placeId: string): Promise<unknown> => {
    const svc = detailsServiceRef.current;
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
        }
      );
    });
  }, []);

  return { ready, error, getPredictions, getPlaceDetails };
}

