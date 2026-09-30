import { postalCodeFromAddressComponents } from '@tutorix/shared-utils';
import { loadGoogleMaps } from './google-maps-loader';

export async function reverseGeocodePostalCode(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  if (!latitude || !longitude) {
    return undefined;
  }

  try {
    const google = await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();

    return await new Promise((resolve) => {
      geocoder.geocode(
        { location: { lat: latitude, lng: longitude } },
        (results, status) => {
          if (status !== 'OK' || !results?.length) {
            resolve(undefined);
            return;
          }
          for (const result of results) {
            const components = (result.address_components ?? []) as Array<{
              long_name: string;
              short_name: string;
              types: string[];
            }>;
            const pin = postalCodeFromAddressComponents(components);
            if (pin) {
              resolve(pin);
              return;
            }
          }
          resolve(undefined);
        },
      );
    });
  } catch {
    return undefined;
  }
}
