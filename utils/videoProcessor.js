import { exec } from 'child_process';
import fs from 'fs';

// ...existing code...

const applyBackground = (bgPath, videoPath, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Just copy the file without applying any effects
      fs.copyFileSync(videoPath, outputPath);
      resolve(outputPath);
    } catch (error) {
      console.error('❌ Error copying file:', error);
      reject(error);
    }
  });
};