"use client";

/**
 * Checks if an image URL is valid and accessible
 * This is useful for detecting empty Telegram profile photos
 * where the URL might exist but the image is not accessible due to privacy settings
 * 
 * @param imageUrl The URL of the image to check
 * @returns A promise that resolves to true if the image is valid, false otherwise
 */
export const isValidImage = async (imageUrl: string): Promise<boolean> => {
  // If no URL is provided, return false
  if (!imageUrl) return false;
  
  // Create a new image element
  return new Promise((resolve) => {
    const img = new Image();
    
    // Set up event handlers
    img.onload = () => {
      // Check if the image has dimensions (not empty)
      if (img.width > 0 && img.height > 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    };
    
    img.onerror = () => {
      // Image failed to load
      resolve(false);
    };
    
    // Set the source to trigger loading
    img.src = imageUrl;
    
    // If the image is already cached, the onload event might not fire
    // So we check immediately if it's complete
    if (img.complete) {
      resolve(img.width > 0 && img.height > 0);
    }
  });
};

/**
 * Creates a fallback avatar using DiceBear
 * 
 * @param telegramId The Telegram ID to use as seed
 * @param size The size of the avatar
 * @returns The data URL of the generated avatar
 */
export const createFallbackAvatar = (
  telegramId: string | number | undefined,
  size: number = 128
): string => {
  if (!telegramId) return "";
  
  // This function will be implemented by the consumer
  // as it requires importing the DiceBear libraries
  return "";
};
