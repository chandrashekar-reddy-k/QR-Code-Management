import { useJsApiLoader } from '@react-google-maps/api';

/**
 * Centralized Google Maps API loader hook.
 * All components MUST use this instead of calling useJsApiLoader directly.
 * This ensures a single, consistent loader instance (same id, key, libraries)
 * across the entire app and prevents the "Loader options have changed" crash.
 */
export function useGoogleMaps() {
  return useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API_KEY || '',
  });
}
