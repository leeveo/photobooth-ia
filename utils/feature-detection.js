/**
 * Utility to check if certain features are available in the current environment
 */

export const isGifGenerationSupported = () => {
  // In browser environment
  if (typeof window !== 'undefined') {
    return true; // Client can always try to call the API
  }
  
  // In server environment
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    return false; // Known limitation in Vercel
  }
  
  // Try to dynamically import the modules
  try {
    require('canvas');
    require('gifencoder');
    return true;
  } catch (err) {
    console.warn('GIF generation not supported in this environment:', err.message);
    return false;
  }
};

/**
 * Returns the appropriate photobooth URL based on environment and type
 */
export const getPhotoboothUrl = (slug, type) => {
  if (type === 'gif' && process.env.NODE_ENV === 'production') {
    // Use standard photobooth in production for GIF type
    return `/photobooth/${slug}`;
  }
  
  // Otherwise use the requested type
  return type === 'gif' ? `/photobooth-gif/${slug}` : `/photobooth/${slug}`;
};
