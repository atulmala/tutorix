import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CREATE_TUTOR_ADDRESS,
  GET_MY_TUTOR_PROFILE,
} from '@tutorix/shared-graphql';
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
  houseNo: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const TutorAddressEntry: React.FC<StepComponentProps> = ({
  onComplete,
  onBack,
}) => {
  const [form, setForm] = useState<AddressForm>({
    locality: '',
    houseNo: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
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
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
      update: (cache, { data }) => {
        if (!data?.createTutorAddress) return;
        try {
          const existing = cache.readQuery<{
            myTutorProfile?: { id: number; certificationStage?: string };
          }>({ query: GET_MY_TUTOR_PROFILE });
          if (existing?.myTutorProfile) {
            cache.writeQuery({
              query: GET_MY_TUTOR_PROFILE,
              data: {
                myTutorProfile: {
                  ...existing.myTutorProfile,
                  certificationStage: 'qualificationExperience',
                },
              },
            });
          }
        } catch {
          // Ignore cache update errors
        }
      },
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

  // Fetch existing address to pre-populate form
  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only', // Always fetch fresh data
  });

  // Pre-populate form with existing HOME address
  useEffect(() => {
    console.log('[TutorAddressEntry] Profile data:', profileData);
    const addresses = profileData?.myTutorProfile?.addresses;
    console.log('[TutorAddressEntry] Addresses:', addresses);
    
    if (addresses && addresses.length > 0) {
      // Find HOME address (type could be string 'HOME' or enum value)
      const homeAddress = addresses.find(
        (addr: { type?: string | number }) => 
          addr.type === 'HOME' || addr.type === 1 || addr.type === 'HOME'
      ) || addresses[0];
      
      console.log('[TutorAddressEntry] Home address found:', homeAddress);

      if (homeAddress) {
        // Parse street into houseNo, addressLine1, addressLine2
        const streetParts = homeAddress.street?.split(', ') || [];
        const houseNo = streetParts[0] || '';
        const addressLine1 = streetParts[1] || '';
        const addressLine2 = streetParts[2] || '';

        setForm({
          locality: homeAddress.subArea || homeAddress.fullAddress || '',
          houseNo,
          addressLine1,
          addressLine2,
          city: homeAddress.city || '',
          state: homeAddress.state || '',
          postalCode: homeAddress.postalCode?.toString() || '',
          country: homeAddress.country || '',
        });

        // Set selected location so form can be submitted
        if (homeAddress.latitude && homeAddress.longitude) {
          setSelectedLocation({
            displayName: homeAddress.subArea || homeAddress.fullAddress || '',
            latitude: homeAddress.latitude,
            longitude: homeAddress.longitude,
            city: homeAddress.city,
            state: homeAddress.state,
            country: homeAddress.country,
            postalCode: homeAddress.postalCode?.toString(),
          });
        }
      }
    }
  }, [profileData]);

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

    const getComponentShort = (type: string): string | undefined => {
      const comp = components.find((c) => c.types.includes(type));
      return comp?.short_name;
    };

    const city =
      getComponent('locality') ||
      getComponent('administrative_area_level_2') ||
      getComponent('sublocality') ||
      getComponent('postal_town');

    const state = getComponent('administrative_area_level_1');
    const country = getComponent('country');
    // Use postal_code, fallback to postal_code_prefix; try both long_name and short_name (some regions use short for codes)
    const postalCode =
      getComponent('postal_code') ||
      getComponentShort('postal_code') ||
      getComponent('postal_code_prefix') ||
      getComponentShort('postal_code_prefix');

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
          city: loc.city ?? '',
          state: loc.state ?? '',
          country: loc.country ?? '',
          postalCode: loc.postalCode ?? '',
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

    if (!form.houseNo.trim()) {
      newErrors.houseNo = 'House No. is required';
    }

    if (!form.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address Line 1 is required';
    }

    if (!form.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!form.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!form.postalCode.trim()) {
      newErrors.postalCode = 'Post Code is required';
    }

    if (!form.country.trim()) {
      newErrors.country = 'Country is required';
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
      // Build full address from components
      const addressParts = [
        form.houseNo,
        form.addressLine1,
        form.addressLine2,
        form.city,
        form.state,
        form.postalCode,
        form.country,
      ].filter(Boolean);
      const fullAddress = addressParts.join(', ');

      await createAddress({
        variables: {
          input: {
            type: 'HOME',
            street: [form.houseNo, form.addressLine1, form.addressLine2]
              .filter(Boolean)
              .join(', ') || undefined,
            subArea: form.locality,
            city: form.city || undefined,
            state: form.state || undefined,
            country: form.country || undefined,
            landmark: undefined,
            postalCode: form.postalCode
              ? parseInt(form.postalCode, 10)
              : undefined,
            fullAddress: fullAddress || form.locality,
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
      {/* Locality field with autocomplete */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-primary">
          Locality <span className="text-danger">*</span>
        </label>
        <p className="text-xs text-muted mb-2">
          Start typing and select the best matching location from the options
        </p>
        <div className="relative">
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
            <p className="text-xs text-danger mt-1">{errors.locality}</p>
          )}
          {(apiError || mapsError) && (
            <p className="text-xs text-amber-600 mt-1">
              {apiError || mapsError}
            </p>
          )}
        </div>
      </div>

      {/* House No, Address Line 1, Address Line 2 in same row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label htmlFor="houseNo" className="text-sm font-medium text-primary">
            House No. <span className="text-danger">*</span>
          </label>
          <input
            id="houseNo"
            type="text"
            value={form.houseNo}
            onChange={(e) => handleFieldChange('houseNo', e.target.value)}
            className={`h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
              errors.houseNo ? 'border-danger' : 'border-subtle'
            }`}
            placeholder="House/Flat No."
          />
          {errors.houseNo && (
            <p className="text-xs text-danger">{errors.houseNo}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="addressLine1" className="text-sm font-medium text-primary">
            Address Line 1 <span className="text-danger">*</span>
          </label>
          <input
            id="addressLine1"
            type="text"
            value={form.addressLine1}
            onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
            className={`h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
              errors.addressLine1 ? 'border-danger' : 'border-subtle'
            }`}
            placeholder="Street, Area"
          />
          {errors.addressLine1 && (
            <p className="text-xs text-danger">{errors.addressLine1}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="addressLine2" className="text-sm font-medium text-primary">
            Address Line 2
          </label>
          <input
            id="addressLine2"
            type="text"
            value={form.addressLine2}
            onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
            className="h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none"
            placeholder="Landmark (optional)"
          />
        </div>
      </div>

      {/* City, State, Post Code, Country in same row - auto-filled but editable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label htmlFor="city" className="text-sm font-medium text-primary">
            City <span className="text-danger">*</span>
          </label>
          <input
            id="city"
            type="text"
            value={form.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            className={`h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
              errors.city ? 'border-danger' : 'border-subtle'
            }`}
            placeholder="City"
          />
          {errors.city && (
            <p className="text-xs text-danger">{errors.city}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="state" className="text-sm font-medium text-primary">
            State <span className="text-danger">*</span>
          </label>
          <input
            id="state"
            type="text"
            value={form.state}
            onChange={(e) => handleFieldChange('state', e.target.value)}
            className={`h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
              errors.state ? 'border-danger' : 'border-subtle'
            }`}
            placeholder="State"
          />
          {errors.state && (
            <p className="text-xs text-danger">{errors.state}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="postalCode" className="text-sm font-medium text-primary">
            Post Code <span className="text-danger">*</span>
          </label>
          <input
            id="postalCode"
            type="text"
            value={form.postalCode}
            onChange={(e) => handleFieldChange('postalCode', e.target.value)}
            className={`h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
              errors.postalCode ? 'border-danger' : 'border-subtle'
            }`}
            placeholder="Post Code"
          />
          {errors.postalCode && (
            <p className="text-xs text-danger">{errors.postalCode}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="country" className="text-sm font-medium text-primary">
            Country <span className="text-danger">*</span>
          </label>
          <input
            id="country"
            type="text"
            value={form.country}
            onChange={(e) => handleFieldChange('country', e.target.value)}
            className={`h-11 w-full rounded-md border bg-white px-3 text-primary shadow-sm focus:outline-none focus:border-primary ${
              errors.country ? 'border-danger' : 'border-subtle'
            }`}
            placeholder="Country"
          />
          {errors.country && (
            <p className="text-xs text-danger">{errors.country}</p>
          )}
        </div>
      </div>

      {/* Note about teaching address */}
      <div className="rounded-lg border border-subtle bg-gray-50 p-4">
        <p className="text-sm text-primary/90">
          If you conduct classes at a different address, you can enter it after
          your onboarding & certification is successfully completed.
        </p>
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
