/**
 * Utility functions for geocoding and reverse geocoding using Google Maps API
 */

/**
 * Converts latitude and longitude coordinates to a human-readable address
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise that resolves to the formatted address or error message
 */
export async function getAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    // Check if coordinates are valid
    if (!latitude || !longitude) {
      return "Invalid coordinates";
    }

    // Special case for "anywhere" (0,0 coordinates)
    if (latitude === 0 && longitude === 0) {
      return "ANYWHERE";
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key is missing");
      return "Address unavailable";
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].formatted_address;
    }

    return "Address unavailable";
  } catch (error) {
    console.error("Error fetching address from coordinates:", error);
    return "Address unavailable";
  }
}

/**
 * Cache for geocoding results to minimize API calls
 */
const geocodingCache: Record<string, string> = {};

/**
 * Converts latitude and longitude coordinates to a human-readable address with caching
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise that resolves to the formatted address or error message
 */
export async function getCachedAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string> {
  // Generate cache key
  const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

  // Return cached result if available
  if (geocodingCache[cacheKey]) {
    return geocodingCache[cacheKey];
  }

  // Get address and cache it
  const address = await getAddressFromCoordinates(latitude, longitude);
  geocodingCache[cacheKey] = address;
  
  return address;
}
