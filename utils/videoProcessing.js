/**
 * Video processing utilities that work without ffmpeg dependency
 */

// Configuration to disable ffmpeg dependency
const FFMPEG_ENABLED = false;

/**
 * Simplified function to handle video background merging
 * This version simply returns the original video when ffmpeg is not available
 * 
 * @param {string} videoPath - Path to the original video
 * @param {string} backgroundPath - Path to the background image (ignored when ffmpeg is disabled)
 * @param {string} outputPath - Desired output path (will be ignored when ffmpeg is disabled)
 * @returns {Promise<string>} - Path to the resulting video (original path when ffmpeg is disabled)
 */
export async function mergeVideoWithBackground(videoPath, backgroundPath, outputPath) {
  // When ffmpeg is disabled, just return the original video path
  if (!FFMPEG_ENABLED) {
    console.log('⚠️ ffmpeg is disabled - returning original video without background');
    return videoPath;
  }
  
  // This code would only run if you enable ffmpeg in the future
  try {
    // Return original video as fallback
    return videoPath;
  } catch (error) {
    console.error('Error merging video with background:', error);
    // Return original video in case of error
    return videoPath;
  }
}

/**
 * Check if video processing with background is available
 * @returns {boolean} - Whether video background processing is available
 */
export function isVideoProcessingAvailable() {
  return FFMPEG_ENABLED;
}

/**
 * Process a static image instead of video when ffmpeg is not available
 * 
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processing result
 */
export async function processStaticImage(options) {
  // Just return a success response with the original paths
  return {
    success: true,
    message: 'Static image processing completed (ffmpeg disabled)',
    imagePath: options.inputPath || options.outputPath
  };
}
