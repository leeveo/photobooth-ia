/**
 * Utility to check if certain features are available in the current environment
 */

export const isGifGenerationSupported = () => {
  // In browser environment, check the environment variable
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_GIF_ENABLED === 'true';
  }
  
  // Never attempt to use canvas in production on Vercel
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  
  // In development, we can try to use these modules
  try {
    // Use dynamic import to avoid build errors
    require.resolve('canvas');
    require.resolve('gifencoder');
    return true;
  } catch (err) {
    console.warn('GIF generation not supported in this environment');
    return false;
  }
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
  // Otherwise use the requested type
  return type === 'gif' ? `/photobooth-gif/${slug}` : `/photobooth/${slug}`;
};
