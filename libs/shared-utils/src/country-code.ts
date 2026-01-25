/**
 * Country Code Utilities
 * 
 * Maps between country codes used in the frontend (e.g., 'IN', 'US', 'GB')
 * and phone country codes used in the backend (e.g., '+91', '+1', '+44')
 */

/**
 * Mapping from ISO country codes to phone country codes
 */
const COUNTRY_CODE_MAP: Record<string, string> = {
  IN: '+91',
  US: '+1',
  GB: '+44',
  CA: '+1',
  AU: '+61',
  DE: '+49',
  FR: '+33',
  IT: '+39',
  ES: '+34',
  BR: '+55',
  MX: '+52',
  JP: '+81',
  CN: '+86',
  KR: '+82',
  SG: '+65',
  AE: '+971',
  SA: '+966',
};

/**
 * Get phone country code from ISO country code
 * @param isoCode - ISO country code (e.g., 'IN', 'US')
 * @returns Phone country code (e.g., '+91', '+1')
 */
export function getPhoneCountryCode(isoCode: string): string {
  return COUNTRY_CODE_MAP[isoCode.toUpperCase()] || '+91'; // Default to +91 (India)
}

/**
 * Get ISO country code from phone country code
 * @param phoneCode - Phone country code (e.g., '+91', '+1')
 * @returns ISO country code (e.g., 'IN', 'US')
 */
export function getIsoCountryCode(phoneCode: string): string {
  const entry = Object.entries(COUNTRY_CODE_MAP).find(
    ([, code]) => code === phoneCode
  );
  return entry ? entry[0] : 'IN'; // Default to IN (India)
}
