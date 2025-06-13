import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

// Create a singleton FFmpeg instance
let ffmpegInstance = null;

const getFFmpeg = async () => {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  const ffmpeg = createFFmpeg({ 
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
  });
  
  await ffmpeg.load();
  ffmpegInstance = ffmpeg;
  return ffmpeg;
};

/**
 * Apply background to a video with chroma key effect
 * @param {string} bgPath - Path to background image
 * @param {string} videoPath - Path to video file
 * @param {string} outputPath - Path for output file
 * @param {Object} options - Additional options
 * @returns {Promise<Buffer>} - The processed video as buffer
 */
export const applyBackgroundToVideo = async (bgPath, videoPath, outputPath, options = {}) => {
  try {
    const ffmpeg = await getFFmpeg();
    
    // Read input files
    ffmpeg.FS('writeFile', 'bg.jpg', await fetchFile(bgPath));
    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoPath));
    
    // Run FFmpeg command
    await ffmpeg.run(
      '-i', 'bg.jpg',
      '-i', 'input.mp4',
      '-filter_complex', '[1:v]colorkey=black:0.005:0.1[fg];[0:v][fg]overlay=format=auto',
      '-preset', 'veryfast',
      '-y', 'output.mp4'
    );
    
    // Read the result
    const data = ffmpeg.FS('readFile', 'output.mp4');
    
    // Clean up files if needed
    ffmpeg.FS('unlink', 'bg.jpg');
    ffmpeg.FS('unlink', 'input.mp4');
    ffmpeg.FS('unlink', 'output.mp4');
    
    return data;
  } catch (error) {
    console.error('FFmpeg error:', error);
    throw error;
  }
};

export default {
  getFFmpeg,
  applyBackgroundToVideo
};
