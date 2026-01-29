import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_TUTOR_ADDRESS } from '@tutorix/shared-graphql';
import { useGooglePlacesAutocomplete } from '../../../../hooks/useGooglePlacesAutocomplete';
import type { StepComponentProps } from '../types';

interface LocationSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface AddressForm {
  locality: string;
  street: string;
  landmark: string;
  postalCode: string;
  fullAddress: string;
}

export const TutorAddressEntry: React.FC<StepComponentProps> = ({
  onComplete,
  onBack,
}) => {
  const [form, setForm] = useState<AddressForm>({
    locality: '',
    street: '',
    landmark: '',
    postalCode: '',
    fullAddress: '',
  });

  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof AddressForm, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    { description: string; placeId: string; secondaryText?: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const localityInputRef = useRef<HTMLInputElement | null>(null);

  const { ready, error: mapsError, getPredictions, getPlaceDetails } =
    useGooglePlacesAutocomplete();

  const [createAddress, { loading: isSubmitting }] = useMutation(
    CREATE_TUTOR_ADDRESS,
    {
      onCompleted: () => {
        onComplete();
      },
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to save address. Please try again.'
        );
      },
    }
  );

  const handleFieldChange = <K extends keyof AddressForm>(
    key: K,
    value: AddressForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleLocalityChange = (value: string) => {
    setForm((prev) => ({ ...prev, locality: value }));
    setErrors((prev) => ({ ...prev, locality: undefined }));
    setSelectedLocation(null);
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        localityInputRef.current &&
        !localityInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced predictions when locality input changes
  useEffect(() => {
    const query = form.locality.trim();

    if (!ready || !query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      setApiError(null);
      return;
    }

    setIsSearching(true);
    setApiError(null);

    const timeoutId = window.setTimeout(() => {
      getPredictions(query)
        .then(
          (
            results: {
              description: string;
              placeId: string;
              secondaryText?: string;
            }[]
          ) => {
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setIsSearching(false);
          }
        )
        .catch((err: unknown) => {
          setIsSearching(false);
          setSuggestions([]);
          setShowSuggestions(false);
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Failed to search locations. Please try again.';
          setApiError(message);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [form.locality, ready, getPredictions]);

  const mapPlaceToLocation = useCallback((place: unknown): LocationSuggestion => {
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
    const postalCode = getComponent('postal_code');

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
  }, []);

  const handleSelectSuggestion = useCallback(
    async (placeId: string) => {
      try {
        const place = await getPlaceDetails(placeId);
        const loc = mapPlaceToLocation(place);

        setSelectedLocation(loc);
        setForm((prev) => ({
          ...prev,
          locality: loc.displayName,
          fullAddress: loc.displayName,
          postalCode: loc.postalCode ?? prev.postalCode,
        }));
        setErrors((prev) => ({ ...prev, locality: undefined }));
        setShowSuggestions(false);
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to fetch place details. Please try again.';
        setApiError(message);
      }
    },
    [getPlaceDetails, mapPlaceToLocation]
  );

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressForm, string>> = {};

    if (!form.locality.trim()) {
      newErrors.locality = 'Locality is required';
    }

    if (!selectedLocation && form.locality.trim().length > 0) {
      newErrors.locality = 'Please select a location from the suggestions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    if (!selectedLocation) {
      setErrors({ locality: 'Please select a location from the suggestions' });
      return;
    }

    try {
      await createAddress({
        variables: {
          input: {
            street: form.street || undefined,
            subArea: form.locality,
            city: selectedLocation.city,
            state: selectedLocation.state,
            country: selectedLocation.country,
            landmark: form.landmark || undefined,
            postalCode: form.postalCode
              ? parseInt(form.postalCode, 10)
              : undefined,
            fullAddress: form.fullAddress || form.locality,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          },
        },
      });
    } catch {
      // Error handled by onError callback
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium text-primary">
          Locality <span className="text-danger">*</span>
        </label>
        <div
          className={`locality-autocomplete-wrap min-h-[44px] w-full rounded-md border ${
            errors.locality ? 'border-danger' : 'border-subtle'
          } bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-0`}
        >
          <input
            id="locality"
            ref={localityInputRef}
            type="text"
            value={form.locality}
            onChange={(e) => handleLocalityChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            disabled={!ready || !!mapsError}
            className="h-11 w-full rounded-md border-none bg-transparent px-3 text-primary outline-none"
            placeholder="Start typing your locality or address..."
            autoComplete="off"
          />
          {isSearching && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md border border-subtle bg-white shadow-lg"
            >
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  type="button"
                  onClick={() => handleSelectSuggestion(s.placeId)}
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
        {errors.locality && (
          <p className="text-xs text-danger">{errors.locality}</p>
        )}
        {(apiError || mapsError) && (
          <p className="text-xs text-amber-600">
            {apiError || mapsError}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="street" className="text-sm font-medium text-primary">
          Street Address
        </label>
        <input
          id="street"
          type="text"
          value={form.street}
          onChange={(e) => handleFieldChange('street', e.target.value)}
          className="h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none"
          placeholder="Enter street address (optional)"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="landmark" className="text-sm font-medium text-primary">
          Landmark
        </label>
        <input
          id="landmark"
          type="text"
          value={form.landmark}
          onChange={(e) => handleFieldChange('landmark', e.target.value)}
          className="h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none"
          placeholder="Enter nearby landmark (optional)"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="postalCode"
          className="text-sm font-medium text-primary"
        >
          Postal Code
        </label>
        <input
          id="postalCode"
          type="text"
          value={form.postalCode}
          onChange={(e) => handleFieldChange('postalCode', e.target.value)}
          className="h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none"
          placeholder="Enter postal code"
          readOnly={!!selectedLocation?.postalCode}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="fullAddress"
          className="text-sm font-medium text-primary"
        >
          Full Address
        </label>
        <textarea
          id="fullAddress"
          value={form.fullAddress}
          onChange={(e) => handleFieldChange('fullAddress', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-subtle bg-white px-3 py-2 text-primary shadow-sm focus:border-primary focus:outline-none"
          placeholder="Full address will be auto-filled"
        />
      </div>

      {submitError && (
        <div className="rounded-lg border border-danger bg-red-50 p-3 text-sm text-danger">
          {submitError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-lg border border-subtle px-6 text-sm font-semibold text-primary shadow-sm transition hover:border-primary"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !selectedLocation}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
};
