import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { BRAND_NAME } from '../config';
import { CREATE_TUTOR_ADDRESS } from '@tutorix/shared-graphql';
import { SEARCH_LOCATIONS } from '@tutorix/shared-graphql';

type TutorOnboardingProps = {
  onComplete?: () => void;
  onBack?: () => void;
};

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

export const TutorOnboarding: React.FC<TutorOnboardingProps> = ({
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

  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const localityInputRef = useRef<HTMLInputElement>(null);

  const [searchLocations] = useLazyQuery(SEARCH_LOCATIONS, {
    onCompleted: (data) => {
      setSuggestions(data.searchLocations || []);
      setIsSearching(false);
      setShowSuggestions(true);
    },
    onError: (error) => {
      console.error('Error searching locations:', error);
      setIsSearching(false);
      setSuggestions([]);
    },
  });

  const [createAddress, { loading: isSubmitting }] = useMutation(CREATE_TUTOR_ADDRESS, {
    onCompleted: () => {
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error) => {
      setSubmitError(
        error.graphQLErrors?.[0]?.message ||
        error.message ||
        'Failed to save address. Please try again.'
      );
    },
  });

  // Handle click outside to close suggestions
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

  // Search for locations when locality input changes
  useEffect(() => {
    const query = form.locality.trim();
    
    if (query.length >= 2) {
      // Debounce search
      const timeoutId = setTimeout(() => {
        setIsSearching(true);
        searchLocations({ variables: { query } });
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedLocation(null);
    }
  }, [form.locality, searchLocations]);

  const handleLocalityChange = (value: string) => {
    setForm((prev) => ({ ...prev, locality: value }));
    setErrors((prev) => ({ ...prev, locality: undefined }));
    setSelectedLocation(null);
  };

  const handleSelectLocation = (location: LocationSuggestion) => {
    setSelectedLocation(location);
    setForm((prev) => ({
      ...prev,
      locality: location.displayName,
      fullAddress: location.displayName,
      postalCode: location.postalCode || '',
    }));
    setShowSuggestions(false);
    setErrors((prev) => ({ ...prev, locality: undefined }));
  };

  const handleFieldChange = <K extends keyof AddressForm>(
    key: K,
    value: AddressForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

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
            postalCode: form.postalCode ? parseInt(form.postalCode, 10) : undefined,
            fullAddress: form.fullAddress || form.locality,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          },
        },
      });
    } catch (error) {
      // Error is handled by onError callback
    }
  };

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-subtle bg-white p-8 shadow-md">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">
          Welcome to {BRAND_NAME}
        </h1>
        <p className="mt-2 text-base text-muted">
          Please start your On-Boarding
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Locality Field with Autocomplete */}
        <div className="space-y-1">
          <label htmlFor="locality" className="text-sm font-medium text-primary">
            Locality <span className="text-danger">*</span>
          </label>
          <div className="relative">
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
              className={`h-11 w-full rounded-md border ${
                errors.locality ? 'border-danger' : 'border-subtle'
              } bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none`}
              placeholder="Start typing your locality..."
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            )}
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-subtle bg-white shadow-lg"
              >
                {suggestions.map((location, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectLocation(location)}
                    className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-subtle focus:bg-subtle focus:outline-none"
                  >
                    <div className="font-medium">{location.displayName}</div>
                    {(location.city || location.state) && (
                      <div className="text-xs text-muted">
                        {[location.city, location.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.locality && (
            <p className="text-xs text-danger">{errors.locality}</p>
          )}
        </div>

        {/* Street Address */}
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

        {/* Landmark */}
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

        {/* Postal Code */}
        <div className="space-y-1">
          <label htmlFor="postalCode" className="text-sm font-medium text-primary">
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

        {/* Full Address (auto-filled, editable) */}
        <div className="space-y-1">
          <label htmlFor="fullAddress" className="text-sm font-medium text-primary">
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
    </div>
  );
};
