import { applyBackgroundToVideo } from '../../utils/ffmpegUtils';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get paths from request (adjust according to your app structure)
    const bgPath = path.join(process.cwd(), 'public', 'uploads', 'bg.jpg');
    const videoPath = path.join(process.cwd(), 'public', 'uploads', 'merged_static.mp4');
    const outputPath = path.join(process.cwd(), 'public', 'uploads', 'merged_with_bg.mp4');
    
    // Process the video using ffmpeg.wasm
    const outputBuffer = await applyBackgroundToVideo(bgPath, videoPath, outputPath);
    
    // Save the output file
    await fsPromises.writeFile(outputPath, outputBuffer);
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      outputPath: '/uploads/merged_with_bg.mp4'
    });
  } catch (error) {
    console.error('Error processing video:', error);
    return res.status(500).json({ error: error.message });
  }
}
