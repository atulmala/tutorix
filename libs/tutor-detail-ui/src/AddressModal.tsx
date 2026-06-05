import React, { useEffect, useState } from 'react';
import type { TutorDetailRecord } from './types';

type TutorAddress = TutorDetailRecord['addresses'][number];
type RequiredAddressTextField = Exclude<keyof AddressFormValues, 'latitude' | 'longitude'>;

export type AddressPlacePrediction = {
  description: string;
  placeId: string;
  secondaryText?: string;
};

export type AddressLocationSuggestion = {
  displayName: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
};

export type AddressFormValues = {
  street: string;
  subArea: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

type AddressModalProps = {
  open: boolean;
  initialValues?: TutorAddress | null;
  saving?: boolean;
  error?: string | null;
  autocomplete?: {
    ready: boolean;
    error?: string | null;
    getPredictions: (input: string) => Promise<AddressPlacePrediction[]>;
    getPlaceDetails: (placeId: string) => Promise<AddressLocationSuggestion | null>;
  };
  onClose: () => void;
  onSubmit: (values: AddressFormValues) => void;
};

const EMPTY_FORM: AddressFormValues = {
  street: '',
  subArea: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
};

function toForm(address?: TutorAddress | null): AddressFormValues {
  if (!address) return EMPTY_FORM;
  return {
    street: address.street?.trim() ?? '',
    subArea: address.subArea?.trim() ?? '',
    city: address.city?.trim() ?? '',
    state: address.state?.trim() ?? '',
    postalCode: address.postalCode != null ? String(address.postalCode) : '',
    country: address.country?.trim() || 'India',
  };
}

export function AddressModal({
  open,
  initialValues,
  saving = false,
  error,
  autocomplete,
  onClose,
  onSubmit,
}: AddressModalProps) {
  const [form, setForm] = useState<AddressFormValues>(EMPTY_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<AddressLocationSuggestion | null>(null);
  const [localityChanged, setLocalityChanged] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressPlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(toForm(initialValues));
    setValidationError(null);
    setSelectedLocation(null);
    setLocalityChanged(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsSearching(false);
    setAutocompleteError(null);
  }, [open, initialValues]);

  useEffect(() => {
    if (!open || !autocomplete?.ready || !localityChanged) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    const query = form.subArea.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setAutocompleteError(null);

    const timeoutId = window.setTimeout(() => {
      autocomplete
        .getPredictions(query)
        .then((results) => {
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to search locations. Please try again.';
          setAutocompleteError(message);
          setSuggestions([]);
          setShowSuggestions(false);
        })
        .finally(() => setIsSearching(false));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [autocomplete, form.subArea, localityChanged, open]);

  if (!open) return null;

  const updateField = (field: keyof AddressFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleLocalityChange = (value: string) => {
    setForm((current) => ({ ...current, subArea: value }));
    setSelectedLocation(null);
    setLocalityChanged(true);
    setValidationError(null);
  };

  const handleSelectSuggestion = async (placeId: string) => {
    if (!autocomplete) return;
    try {
      const loc = await autocomplete.getPlaceDetails(placeId);
      if (!loc) return;
      setSelectedLocation(loc);
      setLocalityChanged(false);
      setForm((current) => ({
        ...current,
        subArea: loc.displayName,
        city: loc.city ?? '',
        state: loc.state ?? '',
        country: loc.country ?? '',
        postalCode: loc.postalCode ?? '',
      }));
      setSuggestions([]);
      setShowSuggestions(false);
      setAutocompleteError(null);
      setValidationError(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch place details. Please try again.';
      setAutocompleteError(message);
    }
  };

  const handleSubmit = () => {
    const requiredFields: RequiredAddressTextField[] = [
      'street',
      'subArea',
      'city',
      'state',
      'postalCode',
      'country',
    ];
    const missingField = requiredFields.find((field) => !form[field].trim());
    if (missingField) {
      setValidationError('Please fill all address fields.');
      return;
    }
    if (!/^\d{6}$/.test(form.postalCode.trim())) {
      setValidationError('Post Code must be 6 digits.');
      return;
    }
    if (localityChanged && !selectedLocation) {
      setValidationError('Please select a locality from the suggestions.');
      return;
    }
    setValidationError(null);
    onSubmit({
      street: form.street.trim(),
      subArea: form.subArea.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.trim(),
      country: form.country.trim(),
      latitude: selectedLocation?.latitude,
      longitude: selectedLocation?.longitude,
    });
  };

  const displayError = validationError ?? autocompleteError ?? autocomplete?.error ?? error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="address-title" className="text-xl font-semibold text-primary">
            Address
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition hover:text-primary"
            aria-label="Close"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <Field
            label="Street / house no"
            value={form.street}
            onChange={(value) => updateField('street', value)}
            disabled={saving}
          />
          <div className="space-y-1 text-left">
            <label htmlFor="address-locality" className="text-sm font-medium text-primary">
              Locality
            </label>
            <div className="relative">
              <input
                id="address-locality"
                value={form.subArea}
                onChange={(event) => handleLocalityChange(event.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                disabled={saving}
                className="w-full rounded-lg border border-subtle px-3 py-2 pr-10 text-sm text-primary outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50"
              />
              {isSearching ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-cyan-700">
                  ...
                </span>
              ) : null}
              {showSuggestions && suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-subtle bg-white shadow-lg">
                  {suggestions.map((item) => (
                    <button
                      key={item.placeId}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void handleSelectSuggestion(item.placeId)}
                      className="block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-cyan-50"
                    >
                      <span className="block text-sm font-semibold text-primary">
                        {item.description}
                      </span>
                      {item.secondaryText ? (
                        <span className="mt-0.5 block text-xs text-muted">
                          {item.secondaryText}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="City"
              value={form.city}
              onChange={(value) => updateField('city', value)}
              disabled={saving}
            />
            <Field
              label="State"
              value={form.state}
              onChange={(value) => updateField('state', value)}
              disabled={saving}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Post Code"
              value={form.postalCode}
              onChange={(value) => updateField('postalCode', value.replace(/\D/g, ''))}
              disabled={saving}
              inputMode="numeric"
            />
            <Field
              label="Country"
              value={form.country}
              onChange={(value) => updateField('country', value)}
              disabled={saving}
            />
          </div>

          {displayError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {displayError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-muted transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save address'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="space-y-1 text-left">
      <label htmlFor={id} className="text-sm font-medium text-primary">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        inputMode={inputMode}
        className="w-full rounded-lg border border-subtle px-3 py-2 text-sm text-primary outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50"
      />
    </div>
  );
}
