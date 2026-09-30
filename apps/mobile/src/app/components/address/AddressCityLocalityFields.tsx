import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { SelectedCity } from '@tutorix/shared-utils';
import type { useAddressCityLocalitySearch } from '../../../hooks/useAddressCityLocalitySearch';
import type { LocationSuggestion } from '../../../hooks/useGooglePlacesFetch';
import { LocalityValueInput } from './LocalityValueInput';

type SearchState = ReturnType<typeof useAddressCityLocalitySearch>;

type Props = {
  search: SearchState;
  cityError?: string;
  localityError?: string;
  disabled?: boolean;
  suggestionListMaxHeight?: number;
  labelColor?: string;
  onOtherFieldFocus?: () => void;
  onCitySelected?: (city: SelectedCity) => void;
  onLocalityQueryChange?: (value: string) => void;
  onLocalitySelected?: (loc: LocationSuggestion) => void;
};

export const AddressCityLocalityFields: React.FC<Props> = ({
  search,
  cityError,
  localityError,
  disabled,
  suggestionListMaxHeight = 220,
  labelColor = '#143055',
  onOtherFieldFocus,
  onCitySelected,
  onLocalityQueryChange,
  onLocalitySelected,
}) => {
  const {
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

  return (
    <>
      <View style={[styles.group, styles.cityGroup]}>
        <Text style={[styles.label, { color: labelColor }]}>
          City / town / village <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.hint}>
          Search and select where you live before choosing your locality
        </Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.input, !!cityError && styles.inputError]}
            value={cityQuery}
            onChangeText={handleCityQueryChange}
            onFocus={() => {
              onOtherFieldFocus?.();
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
            placeholder="Start typing your city, town, or village..."
            placeholderTextColor="#9ca3af"
            editable={!disabled}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {isSearchingCity ? (
            <View style={styles.trailing}>
              <ActivityIndicator size="small" color="#5fa8ff" />
            </View>
          ) : null}
        </View>
        {showCitySuggestions && citySuggestions.length > 0 ? (
          <ScrollView
            style={[styles.suggestions, { maxHeight: suggestionListMaxHeight }]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            nestedScrollEnabled
          >
            {citySuggestions.map((item) => (
              <TouchableOpacity
                key={item.placeId}
                style={styles.suggestionItem}
                onPress={async () => {
                  const city = await handleSelectCity(item.placeId);
                  if (city) {
                    onCitySelected?.(city);
                  }
                }}
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
          </ScrollView>
        ) : null}
        {cityError ? (
          <Text style={styles.fieldError}>{cityError}</Text>
        ) : null}
      </View>

      <View style={[styles.group, styles.localityGroup]}>
          <Text style={[styles.label, { color: labelColor }]}>
            Locality <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hint}>
            {selectedCity
              ? `Suggestions are limited to ${selectedCity.name}`
              : 'Select your city above to search for locality'}
          </Text>
          <View style={styles.inputWrap}>
            <LocalityValueInput
              value={localityQuery}
              onChangeText={(value) => {
                handleLocalityQueryChange(value);
                if (
                  selectedLocation &&
                  value.trim() === selectedLocation.displayName.trim()
                ) {
                  return;
                }
                onLocalityQueryChange?.(value);
              }}
              onFocus={() => {
                onOtherFieldFocus?.();
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
              placeholder={
                selectedCity
                  ? 'Start typing your locality or address...'
                  : 'Select city first...'
              }
              editable={!disabled && !!selectedCity}
              error={!!localityError}
              preview={!!selectedLocation && !showLocalitySuggestions}
              trailing={
                isSearchingLocality ? (
                  <ActivityIndicator size="small" color="#5fa8ff" />
                ) : null
              }
            />
          </View>
          {showLocalitySuggestions && localitySuggestions.length > 0 ? (
            <ScrollView
              style={[
                styles.suggestions,
                { maxHeight: suggestionListMaxHeight },
              ]}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              nestedScrollEnabled
            >
              {localitySuggestions.map((item) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={styles.suggestionItem}
                  onPress={async () => {
                    const loc = await handleSelectLocality(item.placeId);
                    if (loc) {
                      onLocalitySelected?.(loc);
                    }
                  }}
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
            </ScrollView>
          ) : null}
          {localityError ? (
            <Text style={styles.fieldError}>{localityError}</Text>
          ) : null}
        </View>
    </>
  );
};

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
    zIndex: 20,
  },
  cityGroup: {
    zIndex: 30,
  },
  localityGroup: {
    zIndex: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
  inputWrap: {
    position: 'relative',
    zIndex: 20,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#143055',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  trailing: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  suggestions: {
    marginTop: 4,
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
    color: '#143055',
  },
  suggestionSecondary: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  fieldError: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
});
