/** Minimal type for the Google Maps JS API we use (loader + places). */
interface GoogleMapsPlaces {
  AutocompleteService: new () => {
    getPlacePredictions: (
      req: object,
      cb: (predictions: unknown[] | null, status: string) => void
    ) => void;
  };
  PlacesService: new (div: HTMLElement) => {
    getDetails: (
      req: { placeId: string; fields: string[] },
      cb: (place: unknown, status: string) => void
    ) => void;
  };
}

export interface GoogleMapsApi {
  maps: { places: GoogleMapsPlaces };
}

declare global {
  interface Window {
    google?: GoogleMapsApi;
  }
}

const CALLBACK_NAME = '__googleMapsLoaderCb';

let googleMapsPromise: Promise<GoogleMapsApi> | null = null;

export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in the browser'));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google as GoogleMapsApi);
  }

  if (!googleMapsPromise) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return Promise.reject(
        new Error('VITE_GOOGLE_MAPS_API_KEY is not set in the environment')
      );
    }

    googleMapsPromise = new Promise((resolve, reject) => {
      const cleanup = () => {
        delete (window as unknown as Record<string, unknown>)[CALLBACK_NAME];
      };

      (window as unknown as Record<string, unknown>)[CALLBACK_NAME] = () => {
        cleanup();
        if (window.google?.maps?.places) {
          resolve(window.google as GoogleMapsApi);
        } else {
          googleMapsPromise = null;
          reject(new Error('Google Maps JS loaded but places library is missing'));
        }
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${CALLBACK_NAME}`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = 'true';
      script.onerror = () => {
        cleanup();
        googleMapsPromise = null;
        reject(new Error('Failed to load Google Maps JS'));
      };

      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

