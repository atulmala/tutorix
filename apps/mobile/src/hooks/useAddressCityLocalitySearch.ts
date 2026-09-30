import { useCallback, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import type { SelectedCity } from '@tutorix/shared-utils';
import {
  getCityPredictions,
  getPlaceDetails,
  getPlacePredictions,
  getSelectedCityFromPlaceId,
  type LocationSuggestion,
  type PlacePrediction,
} from './useGooglePlacesFetch';

const COUNTRY_CODE = 'in';

export function useAddressCityLocalitySearch() {
  const [cityQuery, setCityQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<PlacePrediction[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  const [localityQuery, setLocalityQuery] = useState('');
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [localitySuggestions, setLocalitySuggestions] = useState<
    PlacePrediction[]
  >([]);
  const [showLocalitySuggestions, setShowLocalitySuggestions] = useState(false);
  const [isSearchingLocality, setIsSearchingLocality] = useState(false);

  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const citySearchTokenRef = useRef(0);
  const localitySearchTokenRef = useRef(0);
  const suppressCitySearchRef = useRef(false);
  const suppressLocalitySearchRef = useRef(false);

  const hideCitySuggestions = useCallback(() => {
    setShowCitySuggestions(false);
    setCitySuggestions([]);
  }, []);

  const hideLocalitySuggestions = useCallback(() => {
    setShowLocalitySuggestions(false);
    setLocalitySuggestions([]);
  }, []);

  const cancelCitySearch = useCallback(() => {
    citySearchTokenRef.current += 1;
    if (cityDebounceRef.current) {
      clearTimeout(cityDebounceRef.current);
      cityDebounceRef.current = null;
    }
    setIsSearchingCity(false);
  }, []);

  const cancelLocalitySearch = useCallback(() => {
    localitySearchTokenRef.current += 1;
    if (localityDebounceRef.current) {
      clearTimeout(localityDebounceRef.current);
      localityDebounceRef.current = null;
    }
    setIsSearchingLocality(false);
  }, []);

  const handleCityQueryChange = useCallback((value: string) => {
    if (suppressCitySearchRef.current) {
      return;
    }
    if (selectedCity && value.trim() === selectedCity.name.trim()) {
      hideCitySuggestions();
      return;
    }

    setCityQuery(value);
    setSelectedCity(null);

    if (cityDebounceRef.current) {
      clearTimeout(cityDebounceRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      setIsSearchingCity(false);
      return;
    }

    const token = citySearchTokenRef.current;
    setIsSearchingCity(true);
    cityDebounceRef.current = setTimeout(async () => {
      try {
        const results = await getCityPredictions(trimmed, {
          countryCode: COUNTRY_CODE,
        });
        if (token !== citySearchTokenRef.current) {
          return;
        }
        setCitySuggestions(results);
        setShowCitySuggestions(results.length > 0);
      } catch {
        if (token !== citySearchTokenRef.current) {
          return;
        }
        setCitySuggestions([]);
        setShowCitySuggestions(false);
      } finally {
        if (token === citySearchTokenRef.current) {
          setIsSearchingCity(false);
        }
      }
    }, 300);
  }, [hideCitySuggestions, selectedCity]);

  const handleSelectCity = useCallback(async (placeId: string) => {
    cancelCitySearch();
    hideCitySuggestions();
    suppressCitySearchRef.current = true;
    Keyboard.dismiss();
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
      setShowLocalitySuggestions(false);
      hideCitySuggestions();
      queueMicrotask(() => {
        suppressCitySearchRef.current = false;
      });
      return city;
    } catch {
      suppressCitySearchRef.current = false;
      return null;
    }
  }, [cancelCitySearch, hideCitySuggestions]);

  const handleLocalityQueryChange = useCallback(
    (value: string) => {
      if (suppressLocalitySearchRef.current) {
        return;
      }
      if (
        selectedLocation &&
        value.trim() === selectedLocation.displayName.trim()
      ) {
        hideLocalitySuggestions();
        return;
      }

      setLocalityQuery(value);
      setSelectedLocation(null);

      if (!selectedCity) {
        setLocalitySuggestions([]);
        setShowLocalitySuggestions(false);
        return;
      }

      if (localityDebounceRef.current) {
        clearTimeout(localityDebounceRef.current);
      }

      const trimmed = value.trim();
      if (trimmed.length < 2) {
        setLocalitySuggestions([]);
        setShowLocalitySuggestions(false);
        setIsSearchingLocality(false);
        return;
      }

      const token = localitySearchTokenRef.current;
      setIsSearchingLocality(true);
      localityDebounceRef.current = setTimeout(async () => {
        try {
          const results = await getPlacePredictions(trimmed, {
            countryCode: COUNTRY_CODE,
            nearCity: selectedCity,
          });
          if (token !== localitySearchTokenRef.current) {
            return;
          }
          setLocalitySuggestions(results);
          setShowLocalitySuggestions(results.length > 0);
        } catch {
          if (token !== localitySearchTokenRef.current) {
            return;
          }
          setLocalitySuggestions([]);
          setShowLocalitySuggestions(false);
        } finally {
          if (token === localitySearchTokenRef.current) {
            setIsSearchingLocality(false);
          }
        }
      }, 300);
    },
    [hideLocalitySuggestions, selectedCity, selectedLocation],
  );

  const handleSelectLocality = useCallback(
    async (placeId: string) => {
      cancelLocalitySearch();
      hideLocalitySuggestions();
      suppressLocalitySearchRef.current = true;
      Keyboard.dismiss();
      try {
        const loc = await getPlaceDetails(placeId);
        if (loc) {
          setSelectedLocation(loc);
          setLocalityQuery(loc.displayName);
          hideLocalitySuggestions();
          queueMicrotask(() => {
            suppressLocalitySearchRef.current = false;
          });
          return loc;
        }
        suppressLocalitySearchRef.current = false;
        return null;
      } catch {
        suppressLocalitySearchRef.current = false;
        return null;
      }
    },
    [cancelLocalitySearch, hideLocalitySuggestions],
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
    setSelectedLocation,
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
