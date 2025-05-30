// Update the getFfmpegPath function to use ffmpeg-static
export function getFfmpegPath() {
  // For Vercel environment
  try {
    // Try to use ffmpeg-static package
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic) return ffmpegStatic;
  } catch (e) {
    console.log('ffmpeg-static not available, falling back to system ffmpeg');
  }
  
  // Default paths for local development
  if (process.platform === 'win32') {
    return 'ffmpeg.exe'; // Windows
  }
  return 'ffmpeg'; // Linux/Mac
}