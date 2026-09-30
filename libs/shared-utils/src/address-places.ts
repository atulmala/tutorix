/** City / town / village chosen before locality autocomplete in onboarding. */
export type SelectedCity = {
  name: string;
  placeId: string;
  latitude: number;
  longitude: number;
  state?: string;
  country?: string;
};

/** Bias locality autocomplete around the selected city (~40 km). */
export const LOCALITY_SEARCH_RADIUS_M = 40_000;

export type AddressComponentLike = {
  long_name: string;
  short_name: string;
  types: string[];
};

/** Prefer a 6-digit Indian PIN when present in Google address components. */
export function postalCodeFromAddressComponents(
  components: AddressComponentLike[],
): string | undefined {
  const pick = (type: string, useShort = false): string | undefined => {
    const comp = components.find((c) => c.types.includes(type));
    if (!comp) {
      return undefined;
    }
    return useShort ? comp.short_name : comp.long_name;
  };

  const rawCandidates = [
    pick('postal_code'),
    pick('postal_code', true),
    pick('postal_code_prefix'),
    pick('postal_code_prefix', true),
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const raw of rawCandidates) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 6) {
      return digits;
    }
  }

  for (const raw of rawCandidates) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 5) {
      return digits.slice(0, 6);
    }
  }

  return undefined;
}

export function cityNameFromAddressComponents(
  components: AddressComponentLike[],
): string | undefined {
  const pick = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name;

  return (
    pick('locality') ||
    pick('postal_town') ||
    pick('administrative_area_level_2') ||
    pick('administrative_area_level_3') ||
    pick('sublocality_level_1')
  );
}
