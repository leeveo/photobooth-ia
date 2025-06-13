import fs from 'fs';

export const applyBackground = (bgPath, videoPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // Remove the ffmpeg command and replace with file copy
    try {
      fs.copyFileSync(videoPath, outputPath);
      console.log('✅ Video processed (ffmpeg step skipped)');
      resolve(outputPath);
    } catch (error) {
      console.error('❌ Error copying file:', error);
      reject(error);
    }
  });
};