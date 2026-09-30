import React, { useRef, useEffect } from 'react';
import type { SelectedCity } from '@tutorix/shared-utils';
import type { useAddressCityLocalitySearch } from '../../../hooks/useAddressCityLocalitySearch';
import type { LocationSuggestion } from '../../../hooks/useAddressCityLocalitySearch';

type SearchState = ReturnType<typeof useAddressCityLocalitySearch>;

type Props = {
  search: SearchState;
  cityError?: string;
  localityError?: string;
  disabled?: boolean;
  onCitySelected?: (city: SelectedCity) => void;
  onLocalityQueryChange?: (value: string) => void;
  onLocalitySelected?: (loc: LocationSuggestion) => void;
};

export const AddressCityLocalityFields: React.FC<Props> = ({
  search,
  cityError,
  localityError,
  disabled,
  onCitySelected,
  onLocalityQueryChange,
  onLocalitySelected,
}) => {
  const { hideCitySuggestions, hideLocalitySuggestions } = search;
  const citySuggestionsRef = useRef<HTMLDivElement | null>(null);
  const cityInputRef = useRef<HTMLInputElement | null>(null);
  const localitySuggestionsRef = useRef<HTMLDivElement | null>(null);
  const localityInputRef = useRef<HTMLInputElement | null>(null);

  const {
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
    setShowCitySuggestions,
    localityQuery,
    selectedLocation,
    localitySuggestions,
    showLocalitySuggestions,
    isSearchingLocality,
    handleLocalityQueryChange,
    handleSelectLocality,
    setShowLocalitySuggestions,
  } = search;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        citySuggestionsRef.current &&
        !citySuggestionsRef.current.contains(target) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(target)
      ) {
        hideCitySuggestions();
      }
      if (
        localitySuggestionsRef.current &&
        !localitySuggestionsRef.current.contains(target) &&
        localityInputRef.current &&
        !localityInputRef.current.contains(target)
      ) {
        hideLocalitySuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hideCitySuggestions, hideLocalitySuggestions]);

  return (
    <>
      <div className="space-y-1">
        <label className="text-sm font-medium text-primary">
          City / town / village <span className="text-danger">*</span>
        </label>
        <p className="text-xs text-muted mb-2">
          Search and select where you live before choosing your locality
        </p>
        <div className="relative">
          <div
            className={`locality-autocomplete-wrap min-h-[44px] w-full rounded-md border ${
              cityError ? 'border-danger' : 'border-subtle'
            } bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-0`}
          >
            <input
              ref={cityInputRef}
              type="text"
              value={cityQuery}
              onChange={(e) => handleCityQueryChange(e.target.value)}
              onFocus={() => {
                if (
                  selectedCity &&
                  cityQuery.trim() === selectedCity.name.trim()
                ) {
                  return;
                }
                if (citySuggestions.length > 0) {
                  setShowCitySuggestions(true);
                }
              }}
              disabled={!ready || !!mapsError || disabled}
              className="h-11 w-full rounded-md border-none bg-transparent px-3 text-primary outline-none"
              placeholder="Start typing your city, town, or village..."
              autoComplete="off"
            />
            {isSearchingCity && (
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {showCitySuggestions && citySuggestions.length > 0 && (
              <div
                ref={citySuggestionsRef}
                className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md border border-subtle bg-white shadow-lg"
              >
                {citySuggestions.map((s) => (
                  <button
                    key={s.placeId}
                    type="button"
                    onClick={async () => {
                      const city = await handleSelectCity(s.placeId);
                      if (city) {
                        onCitySelected?.(city);
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-subtle focus:bg-subtle focus:outline-none"
                  >
                    <div className="font-medium">{s.description}</div>
                    {s.secondaryText && (
                      <div className="text-xs text-muted">{s.secondaryText}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {cityError && (
            <p className="text-xs text-danger mt-1">{cityError}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-primary">
          Locality <span className="text-danger">*</span>
        </label>
        <p className="text-xs text-muted mb-2">
          {selectedCity
            ? `Suggestions are limited to ${selectedCity.name}`
            : 'Select your city above to search for locality'}
        </p>
        <div className="relative">
          <div
            className={`locality-autocomplete-wrap min-h-[44px] w-full rounded-md border ${
              localityError ? 'border-danger' : 'border-subtle'
            } bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-0`}
          >
            <input
              id="locality"
              ref={localityInputRef}
              type="text"
              value={localityQuery}
              onChange={(e) => {
                const value = e.target.value;
                handleLocalityQueryChange(value);
                onLocalityQueryChange?.(value);
              }}
              onFocus={() => {
                if (
                  selectedLocation &&
                  localityQuery.trim() === selectedLocation.displayName.trim()
                ) {
                  return;
                }
                if (localitySuggestions.length > 0) {
                  setShowLocalitySuggestions(true);
                }
              }}
              disabled={!ready || !!mapsError || !selectedCity || disabled}
              className="h-11 w-full rounded-md border-none bg-transparent px-3 text-primary outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={
                selectedCity
                  ? 'Start typing your locality or address...'
                  : 'Select city first...'
              }
              autoComplete="off"
            />
            {isSearchingLocality && (
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {showLocalitySuggestions && localitySuggestions.length > 0 && (
              <div
                ref={localitySuggestionsRef}
                className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md border border-subtle bg-white shadow-lg"
              >
                {localitySuggestions.map((s) => (
                  <button
                    key={s.placeId}
                    type="button"
                    onClick={async () => {
                      const loc = await handleSelectLocality(s.placeId);
                      if (loc) {
                        onLocalitySelected?.(loc);
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-subtle focus:bg-subtle focus:outline-none"
                  >
                    <div className="font-medium">{s.description}</div>
                    {s.secondaryText && (
                      <div className="text-xs text-muted">{s.secondaryText}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {localityError && (
            <p className="text-xs text-danger mt-1">{localityError}</p>
          )}
          {(apiError || mapsError) && (
            <p className="text-xs text-amber-600 mt-1">
              {apiError || mapsError}
            </p>
          )}
        </div>
      </div>
    </>
  );
};
