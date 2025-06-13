import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
// Remove any import for child_process if it exists

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get paths
    const videoPath = path.join(process.cwd(), 'public', 'uploads', 'merged_static.mp4');
    const outputPath = path.join(process.cwd(), 'public', 'uploads', 'merged_with_bg.mp4');
    
    // Simply copy the file instead of processing with FFmpeg
    fs.copyFileSync(videoPath, outputPath);
    
    // Return success
    return res.status(200).json({ 
      success: true, 
      message: 'Video processed successfully (FFmpeg step skipped)',
      outputPath: '/uploads/merged_with_bg.mp4'
    });
  } catch (error) {
    console.error('Error in background processing:', error);
    return res.status(500).json({ error: error.message });
  }
}
