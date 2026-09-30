import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CREATE_TUTOR_ADDRESS,
  GET_MY_TUTOR_PROFILE,
} from '@tutorix/shared-graphql';
import { useAddressCityLocalitySearch } from '../../../../hooks/useAddressCityLocalitySearch';
import { AddressCityLocalityFields } from '../../address/AddressCityLocalityFields';
import type { StepComponentProps } from '../types';

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

export const TutorAddressEntry: React.FC<StepComponentProps> = () => {
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

  const search = useAddressCityLocalitySearch();
  const { selectedLocation, hydrateFromSavedAddress } = search;

  const [errors, setErrors] = useState<
    Partial<Record<keyof AddressForm | 'citySearch', string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);

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
                  certificationStage: 'qualification',
                },
              },
            });
          }
        } catch {
          // Ignore cache update errors
        }
      },
      onCompleted: () => {
        // Server-driven step sync in TutorOnboarding
      },
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to save address. Please try again.',
        );
      },
    },
  );

  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const addresses = profileData?.myTutorProfile?.addresses;

    if (addresses && addresses.length > 0) {
      const homeAddress =
        addresses.find(
          (addr: { type?: string | number }) =>
            addr.type === 'HOME' || addr.type === 1 || addr.type === 'HOME',
        ) || addresses[0];

      if (homeAddress) {
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

        const loc =
          homeAddress.latitude && homeAddress.longitude
            ? {
                displayName:
                  homeAddress.subArea || homeAddress.fullAddress || '',
                latitude: homeAddress.latitude,
                longitude: homeAddress.longitude,
                city: homeAddress.city,
                state: homeAddress.state,
                country: homeAddress.country,
                postalCode: homeAddress.postalCode?.toString(),
              }
            : null;

        hydrateFromSavedAddress({
          city: homeAddress.city || '',
          locality: homeAddress.subArea || homeAddress.fullAddress || '',
          location: loc,
        });
      }
    }
  }, [profileData, hydrateFromSavedAddress]);

  const handleFieldChange = <K extends keyof AddressForm>(
    key: K,
    value: AddressForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressForm | 'citySearch', string>> =
      {};

    if (!search.selectedCity) {
      newErrors.citySearch = search.cityQuery.trim()
        ? 'Please select your city from the suggestions'
        : 'City / town / village is required';
    }

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
            street:
              [form.houseNo, form.addressLine1, form.addressLine2]
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
      <AddressCityLocalityFields
        search={search}
        cityError={errors.citySearch}
        localityError={errors.locality}
        disabled={isSubmitting}
        onLocalityQueryChange={(v) => {
          setForm((prev) => ({ ...prev, locality: v }));
          setErrors((prev) => ({ ...prev, locality: undefined }));
        }}
        onCitySelected={(city) => {
          setForm((prev) => ({
            ...prev,
            city: city.name,
            state: city.state ?? prev.state,
            country: city.country ?? prev.country,
            locality: '',
            postalCode: '',
          }));
          setErrors((prev) => ({
            ...prev,
            citySearch: undefined,
            city: undefined,
            locality: undefined,
          }));
        }}
        onLocalitySelected={(loc) => {
          setForm((prev) => ({
            ...prev,
            locality: loc.displayName,
            city: search.selectedCity?.name ?? loc.city ?? prev.city,
            state: loc.state ?? prev.state,
            country: loc.country ?? prev.country,
            postalCode: loc.postalCode ?? prev.postalCode,
          }));
          setErrors((prev) => ({
            ...prev,
            locality: undefined,
            postalCode: loc.postalCode ? undefined : prev.postalCode,
          }));
        }}
      />

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
          <label
            htmlFor="addressLine1"
            className="text-sm font-medium text-primary"
          >
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
          <label
            htmlFor="addressLine2"
            className="text-sm font-medium text-primary"
          >
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
          {errors.city && <p className="text-xs text-danger">{errors.city}</p>}
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
          <label
            htmlFor="postalCode"
            className="text-sm font-medium text-primary"
          >
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

      <div className="flex justify-end">
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
