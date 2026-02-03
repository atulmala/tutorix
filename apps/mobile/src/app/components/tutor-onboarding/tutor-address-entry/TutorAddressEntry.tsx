import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { CREATE_TUTOR_ADDRESS } from '@tutorix/shared-graphql/mutations';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import {
  getPlacePredictions,
  getPlaceDetails,
  type PlacePrediction,
  type LocationSuggestion,
} from '../../../../hooks/useGooglePlacesFetch';
import type { StepComponentProps } from '@tutorix/shared-utils';

interface AddressForm {
  locality: string;
  houseNo: string;
  addressLine1: string;
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
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          /* ignore cache update errors */
        }
      },
      onCompleted: () => onComplete?.(),
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to save address. Please try again.'
        );
      },
    }
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
            addr.type === 'HOME' || addr.type === 1
        ) || addresses[0];

      const streetParts = homeAddress.street?.split(', ') || [];
      const houseNo = streetParts[0] || '';
      const addressLine1 = streetParts[1] || '';

      setForm({
        locality: homeAddress.subArea || homeAddress.fullAddress || '',
        houseNo,
        addressLine1,
        city: homeAddress.city || '',
        state: homeAddress.state || '',
        postalCode: homeAddress.postalCode?.toString() || '',
        country: homeAddress.country || '',
      });

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
  }, [profileData]);

  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setSuggestions([]);
  }, []);

  // Defer so the focused field keeps focus (state update after focus would steal it)
  const onOtherFieldFocus = useCallback(() => {
    setTimeout(hideSuggestions, 0);
  }, [hideSuggestions]);

  const handleFieldChange = useCallback(
    <K extends keyof AddressForm>(key: K, value: AddressForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  const handleLocalityChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, locality: value }));
    setErrors((prev) => ({ ...prev, locality: undefined }));
    setSelectedLocation(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await getPlacePredictions(trimmed);
        console.log('[TutorAddressEntry] got results:', results.length, 'showSuggestions will be:', results.length > 0);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (err) {
        console.log('[TutorAddressEntry] getPlacePredictions failed:', err);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSelectSuggestion = useCallback(async (placeId: string) => {
    setShowSuggestions(false);
    try {
      const loc = await getPlaceDetails(placeId);
      if (loc) {
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
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        locality: 'Failed to fetch place details. Please try again.',
      }));
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressForm, string>> = {};

    if (!form.locality.trim()) newErrors.locality = 'Locality is required';
    if (selectedLocation === null && form.locality.trim().length > 0)
      newErrors.locality = 'Please select a location from the suggestions';
    if (!form.houseNo.trim()) newErrors.houseNo = 'House No. is required';
    if (!form.addressLine1.trim())
      newErrors.addressLine1 = 'Address Line 1 is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state.trim()) newErrors.state = 'State is required';
    if (!form.postalCode.trim()) newErrors.postalCode = 'Post Code is required';
    if (!form.country.trim()) newErrors.country = 'Country is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validateForm()) return;
    if (!selectedLocation) {
      setErrors({ locality: 'Please select a location from the suggestions' });
      return;
    }

    const addressParts = [
      form.houseNo,
      form.addressLine1,
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
            [form.houseNo, form.addressLine1].filter(Boolean).join(', ') ||
            undefined,
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
  };

  const InputGroup = ({
    label,
    field,
    placeholder,
    required,
    onFocus,
  }: {
    label: string;
    field: keyof AddressForm;
    placeholder: string;
    required?: boolean;
    onFocus?: () => void;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
        value={form[field]}
        onChangeText={(v) => handleFieldChange(field, v)}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        editable={!isSubmitting}
      />
      {errors[field] && (
        <Text style={styles.fieldError}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.localityGroup}>
          <Text style={styles.label}>
            Locality <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hint}>
            Start typing and select the best matching location
          </Text>
          <View style={styles.localityWrap}>
            <TextInput
              style={[
                styles.localityInput,
                errors.locality && styles.inputError,
              ]}
              value={form.locality}
              onChangeText={handleLocalityChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Start typing your locality or address..."
              placeholderTextColor="#9ca3af"
              editable={!isSubmitting}
            />
            {isSearching && (
              <View style={styles.spinner}>
                <ActivityIndicator size="small" color="#5fa8ff" />
              </View>
            )}
          </View>
          {showSuggestions && suggestions.length > 0 && (() => {
            console.log('[TutorAddressEntry] rendering suggestions list, count:', suggestions.length);
            return (
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
                    <Text style={styles.suggestionSecondary}>
                      {item.secondaryText}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          );
          })()}
          {errors.locality && (
            <Text style={styles.fieldError}>{errors.locality}</Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <InputGroup
              label="House No."
              field="houseNo"
              placeholder="House/Flat No."
              required
              onFocus={onOtherFieldFocus}
            />
          </View>
          <View style={styles.half}>
            <InputGroup
              label="Address Line 1"
              field="addressLine1"
              placeholder="Street, Area"
              required
              onFocus={onOtherFieldFocus}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <InputGroup
              label="City"
              field="city"
              placeholder="City"
              required
              onFocus={onOtherFieldFocus}
            />
          </View>
          <View style={styles.half}>
            <InputGroup
              label="State"
              field="state"
              placeholder="State"
              required
              onFocus={onOtherFieldFocus}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <InputGroup
              label="Post Code"
              field="postalCode"
              placeholder="Post Code"
              required
              onFocus={onOtherFieldFocus}
            />
          </View>
          <View style={styles.half}>
            <InputGroup
              label="Country"
              field="country"
              placeholder="Country"
              required
              onFocus={onOtherFieldFocus}
            />
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            If you conduct classes at a different address, you can enter it
            after your onboarding & certification is successfully completed.
          </Text>
        </View>

        {submitError && (
          <View style={styles.submitError}>
            <Text style={styles.submitErrorText}>{submitError}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              disabled={isSubmitting}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (isSubmitting || !selectedLocation) && styles.continueButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !selectedLocation}
          >
            <Text style={styles.continueButtonText}>
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  half: {
    flex: 1,
  },
  localityGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  required: {
    color: '#dc2626',
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  localityWrap: {
    position: 'relative',
  },
  localityInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  spinner: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
  suggestions: {
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  suggestionSecondary: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  fieldError: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  note: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 14,
    color: '#475569',
  },
  submitError: {
    padding: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    marginBottom: 16,
  },
  submitErrorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  continueButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#5fa8ff',
    borderRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(95, 168, 255, 0.4)',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
