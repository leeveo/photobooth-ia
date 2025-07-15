/**
 * Utility to check if certain features are available in the current environment
 */

export const isGifGenerationSupported = () => {
  // In browser environment
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_GIF_GENERATION_ENABLED === 'true';
  }
  
  // In server environment
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    return false; // Known limitation in Vercel
  }
  
  // For development environments, use env variable or default to true
  return process.env.NODE_ENV !== 'production';
};

/**
 * Returns the appropriate photobooth URL based on environment and type
 */
export const getPhotoboothUrl = (slug, type) => {
  if (type === 'gif' && !isGifGenerationSupported()) {
    // Use standard photobooth when GIF is not supported
    return `/photobooth/${slug}`;
  }
  
  // Otherwise use the requested type
  return type === 'gif' ? `/photobooth-gif/${slug}` : `/photobooth/${slug}`;
};
 * Returns the appropriate photobooth URL based on environment and type
 */
export const getPhotoboothUrl = (slug, type) => {
  if (type === 'gif' && !isGifGenerationSupported()) {
    // Use standard photobooth when GIF is not supported
    return `/photobooth/${slug}`;
  }
  
  // Otherwise use the requested type
  return type === 'gif' ? `/photobooth-gif/${slug}` : `/photobooth/${slug}`;
};
