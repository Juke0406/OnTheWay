// Flag to track if the script is already loaded or loading
let isLoading = false;
let isLoaded = false;

// Promise to track the loading state
let loadingPromise: Promise<void> | null = null;

/**
 * Loads the Google Maps API script only once
 * @returns A promise that resolves when the API is loaded
 */
export function loadGoogleMapsApi(): Promise<void> {
  // If already loaded, return a resolved promise
  if (isLoaded && window.google && window.google.maps) {
    return Promise.resolve();
  }

  // If already loading, return the existing promise
  if (isLoading && loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  isLoading = true;

  // Create a new promise for loading
  loadingPromise = new Promise<void>((resolve, reject) => {
    try {
      // Check if the script is already in the document
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        // If script exists but Google Maps is not loaded yet, wait for it
        const checkGoogleMaps = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkGoogleMaps);
            isLoaded = true;
            isLoading = false;
            resolve();
          }
        }, 100);
        
        // Set a timeout to avoid infinite checking
        setTimeout(() => {
          clearInterval(checkGoogleMaps);
          reject(new Error('Google Maps loading timed out'));
        }, 10000);
        
        return;
      }

      // Create the script element
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      // Set up the callback
      script.onload = () => {
        isLoaded = true;
        isLoading = false;
        resolve();
      };

      script.onerror = (error) => {
        isLoading = false;
        reject(error);
      };

      // Add the script to the document
      document.head.appendChild(script);
    } catch (error) {
      isLoading = false;
      reject(error);
    }
  });

  return loadingPromise;
}
