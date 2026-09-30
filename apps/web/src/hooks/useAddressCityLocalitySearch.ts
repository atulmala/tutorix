import { useCallback, useEffect, useRef, useState } from 'react';
import {
  postalCodeFromAddressComponents,
  type SelectedCity,
} from '@tutorix/shared-utils';
import { reverseGeocodePostalCode } from '../lib/google-reverse-geocode';
import { useGooglePlacesAutocomplete } from './useGooglePlacesAutocomplete';

export interface LocationSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface Prediction {
  description: string;
  placeId: string;
  secondaryText?: string;
}

function mapPlaceToLocation(place: unknown): LocationSuggestion {
  const p = place as {
    formatted_address?: string;
    geometry?: { location?: { lat: () => number; lng: () => number } };
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  };

  const components = p.address_components ?? [];

  const getComponent = (type: string): string | undefined => {
    const comp = components.find((c) => c.types.includes(type));
    return comp?.long_name;
  };

  const city =
    getComponent('locality') ||
    getComponent('administrative_area_level_2') ||
    getComponent('sublocality') ||
    getComponent('postal_town');

  const state = getComponent('administrative_area_level_1');
  const country = getComponent('country');
  const postalCode = postalCodeFromAddressComponents(components);

  const location = p.geometry?.location;
  const lat = location ? location.lat() : 0;
  const lng = location ? location.lng() : 0;

  return {
    displayName: p.formatted_address ?? '',
    latitude: lat,
    longitude: lng,
    city: city || undefined,
    state: state || undefined,
    country: country || undefined,
    postalCode: postalCode || undefined,
  };
}

export function useAddressCityLocalitySearch() {
  const {
    ready,
    error: mapsError,
    getCityPredictions,
    getPredictions,
    getSelectedCityFromPlaceId,
    getPlaceDetails,
  } = useGooglePlacesAutocomplete();

  const [cityQuery, setCityQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<Prediction[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  const [localityQuery, setLocalityQuery] = useState('');
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [localitySuggestions, setLocalitySuggestions] = useState<Prediction[]>(
    [],
  );
  const [showLocalitySuggestions, setShowLocalitySuggestions] = useState(false);
  const [isSearchingLocality, setIsSearchingLocality] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const cityDebounceRef = useRef<number | null>(null);
  const localityDebounceRef = useRef<number | null>(null);
  const citySearchTokenRef = useRef(0);
  const localitySearchTokenRef = useRef(0);

  const cancelCitySearch = useCallback(() => {
    citySearchTokenRef.current += 1;
    if (cityDebounceRef.current) {
      window.clearTimeout(cityDebounceRef.current);
      cityDebounceRef.current = null;
    }
    setIsSearchingCity(false);
  }, []);

  const cancelLocalitySearch = useCallback(() => {
    localitySearchTokenRef.current += 1;
    if (localityDebounceRef.current) {
      window.clearTimeout(localityDebounceRef.current);
      localityDebounceRef.current = null;
    }
    setIsSearchingLocality(false);
  }, []);

  const hideCitySuggestions = useCallback(() => {
    setShowCitySuggestions(false);
    setCitySuggestions([]);
  }, []);

  const hideLocalitySuggestions = useCallback(() => {
    setShowLocalitySuggestions(false);
    setLocalitySuggestions([]);
  }, []);

  useEffect(() => {
    const trimmed = cityQuery.trim();
    if (!ready || trimmed.length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      setIsSearchingCity(false);
      return;
    }

    if (selectedCity && trimmed === selectedCity.name.trim()) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      setIsSearchingCity(false);
      return;
    }

    setApiError(null);
    if (cityDebounceRef.current) {
      window.clearTimeout(cityDebounceRef.current);
    }

    cityDebounceRef.current = window.setTimeout(() => {
      const token = citySearchTokenRef.current;
      setIsSearchingCity(true);
      getCityPredictions(trimmed)
        .then((results) => {
          if (token !== citySearchTokenRef.current) {
            return;
          }
          setCitySuggestions(results);
          setShowCitySuggestions(results.length > 0);
        })
        .catch(() => {
          if (token !== citySearchTokenRef.current) {
            return;
          }
          setCitySuggestions([]);
          setShowCitySuggestions(false);
        })
        .finally(() => {
          if (token === citySearchTokenRef.current) {
            setIsSearchingCity(false);
          }
        });
    }, 300);

    return () => {
      if (cityDebounceRef.current) {
        window.clearTimeout(cityDebounceRef.current);
      }
    };
  }, [cityQuery, ready, getCityPredictions, selectedCity]);

  useEffect(() => {
    const trimmed = localityQuery.trim();
    if (!ready || !selectedCity || trimmed.length < 2) {
      setLocalitySuggestions([]);
      setShowLocalitySuggestions(false);
      setIsSearchingLocality(false);
      return;
    }

    if (
      selectedLocation &&
      trimmed === selectedLocation.displayName.trim()
    ) {
      setLocalitySuggestions([]);
      setShowLocalitySuggestions(false);
      setIsSearchingLocality(false);
      return;
    }

    setApiError(null);
    if (localityDebounceRef.current) {
      window.clearTimeout(localityDebounceRef.current);
    }

    localityDebounceRef.current = window.setTimeout(() => {
      const token = localitySearchTokenRef.current;
      setIsSearchingLocality(true);
      getPredictions(trimmed, { nearCity: selectedCity })
        .then((results) => {
          if (token !== localitySearchTokenRef.current) {
            return;
          }
          setLocalitySuggestions(results);
          setShowLocalitySuggestions(results.length > 0);
        })
        .catch((err: unknown) => {
          if (token !== localitySearchTokenRef.current) {
            return;
          }
          setLocalitySuggestions([]);
          setShowLocalitySuggestions(false);
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Failed to search locations. Please try again.';
          setApiError(message);
        })
        .finally(() => {
          if (token === localitySearchTokenRef.current) {
            setIsSearchingLocality(false);
          }
        });
    }, 300);

    return () => {
      if (localityDebounceRef.current) {
        window.clearTimeout(localityDebounceRef.current);
      }
    };
  }, [localityQuery, ready, selectedCity, selectedLocation, getPredictions]);

  const handleCityQueryChange = useCallback((value: string) => {
    setCityQuery(value);
    setSelectedCity(null);
  }, []);

  const handleSelectCity = useCallback(
    async (placeId: string) => {
      cancelCitySearch();
      hideCitySuggestions();
      try {
        const city = await getSelectedCityFromPlaceId(placeId);
        if (!city) {
          return null;
        }
        setSelectedCity(city);
        setCityQuery(city.name);
        setLocalityQuery('');
        setSelectedLocation(null);
        setLocalitySuggestions([]);
        return city;
      } catch {
        return null;
      }
    },
    [cancelCitySearch, getSelectedCityFromPlaceId, hideCitySuggestions],
  );

  const handleLocalityQueryChange = useCallback((value: string) => {
    setLocalityQuery(value);
    setSelectedLocation(null);
  }, []);

  const handleSelectLocality = useCallback(
    async (placeId: string) => {
      cancelLocalitySearch();
      hideLocalitySuggestions();
      try {
        const place = await getPlaceDetails(placeId);
        const loc = mapPlaceToLocation(place);
        let postalCode = loc.postalCode;
        if (!postalCode && loc.latitude && loc.longitude) {
          postalCode = await reverseGeocodePostalCode(
            loc.latitude,
            loc.longitude,
          );
        }
        const enriched = postalCode ? { ...loc, postalCode } : loc;
        setSelectedLocation(enriched);
        setLocalityQuery(enriched.displayName);
        return enriched;
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to fetch place details. Please try again.';
        setApiError(message);
        return null;
      }
    },
    [cancelLocalitySearch, getPlaceDetails, hideLocalitySuggestions],
  );

  const hydrateFromSavedAddress = useCallback(
    (params: {
      city: string;
      locality: string;
      location: LocationSuggestion | null;
    }) => {
      if (params.city) {
        setCityQuery(params.city);
        setSelectedCity({
          name: params.city,
          placeId: '',
          latitude: params.location?.latitude ?? 0,
          longitude: params.location?.longitude ?? 0,
          state: params.location?.state,
          country: params.location?.country,
        });
      }
      setLocalityQuery(params.locality);
      setSelectedLocation(params.location);
    },
    [],
  );

  return {
    ready,
    mapsError,
    apiError,
    cityQuery,
    selectedCity,
    citySuggestions,
    showCitySuggestions,
    isSearchingCity,
    handleCityQueryChange,
    handleSelectCity,
    hideCitySuggestions,
    setShowCitySuggestions,
    localityQuery,
    selectedLocation,
    localitySuggestions,
    showLocalitySuggestions,
    isSearchingLocality,
    handleLocalityQueryChange,
    handleSelectLocality,
    hideLocalitySuggestions,
    setShowLocalitySuggestions,
    hydrateFromSavedAddress,
  };
}
