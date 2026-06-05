import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TutorDetailRecord } from '@tutorix/tutor-detail-ui';
import {
  getPlaceDetails,
  getPlacePredictions,
  type LocationSuggestion,
  type PlacePrediction,
} from '../../../hooks/useGooglePlacesFetch';

type TutorAddress = TutorDetailRecord['addresses'][number];
type RequiredAddressTextField = Exclude<keyof AddressFormValues, 'latitude' | 'longitude'>;

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
  visible: boolean;
  initialValues?: TutorAddress | null;
  saving?: boolean;
  error?: string | null;
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
  visible,
  initialValues,
  saving = false,
  error,
  onClose,
  onSubmit,
}: AddressModalProps) {
  const [form, setForm] = useState<AddressFormValues>(EMPTY_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [localityChanged, setLocalityChanged] = useState(false);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setForm(toForm(initialValues));
    setValidationError(null);
    setSelectedLocation(null);
    setLocalityChanged(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsSearching(false);
  }, [visible, initialValues]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateField = (field: keyof AddressFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleLocalityChange = (value: string) => {
    setForm((current) => ({ ...current, subArea: value }));
    setSelectedLocation(null);
    setLocalityChanged(true);
    setValidationError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await getPlacePredictions(trimmed);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = async (placeId: string) => {
    setShowSuggestions(false);
    try {
      const loc = await getPlaceDetails(placeId);
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
      setValidationError(null);
    } catch {
      setValidationError('Failed to fetch place details. Please try again.');
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

  const displayError = validationError ?? error;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Address</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" disabled={saving}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Field
              label="Street / house no"
              value={form.street}
              onChangeText={(value) => updateField('street', value)}
              editable={!saving}
            />
            <Field
              label="Locality"
              value={form.subArea}
              onChangeText={handleLocalityChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              editable={!saving}
              trailing={isSearching ? <ActivityIndicator size="small" color="#0d9488" /> : null}
            />
            {showSuggestions && suggestions.length > 0 ? (
              <View style={styles.suggestions}>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.placeId}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item.placeId)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionMain}>{item.description}</Text>
                    {item.secondaryText ? (
                      <Text style={styles.suggestionSecondary}>{item.secondaryText}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <View style={styles.row}>
              <Field
                label="City"
                value={form.city}
                onChangeText={(value) => updateField('city', value)}
                editable={!saving}
              />
              <Field
                label="State"
                value={form.state}
                onChangeText={(value) => updateField('state', value)}
                editable={!saving}
              />
            </View>
            <View style={styles.row}>
              <Field
                label="Post Code"
                value={form.postalCode}
                onChangeText={(value) => updateField('postalCode', value.replace(/\D/g, ''))}
                keyboardType="number-pad"
                editable={!saving}
              />
              <Field
                label="Country"
                value={form.country}
                onChangeText={(value) => updateField('country', value)}
                editable={!saving}
              />
            </View>

            {displayError ? <Text style={styles.error}>{displayError}</Text> : null}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save address</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  editable,
  onFocus,
  trailing,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
  editable?: boolean;
  onFocus?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          editable={editable}
          keyboardType={keyboardType}
          placeholderTextColor="#9ca3af"
        />
        {trailing ? <View style={styles.inputTrailing}>{trailing}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  close: { fontSize: 20, color: '#64748b', padding: 4 },
  body: { gap: 12, paddingBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155' },
  inputWrap: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 36,
    fontSize: 14,
    color: '#0f172a',
  },
  inputTrailing: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  suggestions: {
    marginTop: -6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  suggestionSecondary: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  error: { fontSize: 13, color: '#dc2626' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  saveButton: {
    minWidth: 120,
    alignItems: 'center',
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
