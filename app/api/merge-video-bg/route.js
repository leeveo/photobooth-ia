import { NextResponse } from 'next/server';
import { mergeVideoWithBackground, isVideoProcessingAvailable } from '../../../utils/videoProcessing';

export async function POST(request) {
  try {
    // Parse the incoming request body
    const body = await request.json();
    const { videoPath, backgroundPath, outputPath } = body;
    
    // Check if required parameters are provided
    if (!videoPath) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    // Check if video processing is available
    if (!isVideoProcessingAvailable()) {
      // Return a response with the original video path
      return NextResponse.json({
        success: true,
        message: 'Video processing skipped - ffmpeg not available',
        videoPath: videoPath,
        withBackground: false
      });
    }
    
    // If video processing is available, merge the video with the background
    const resultPath = await mergeVideoWithBackground(
      videoPath,
      backgroundPath || '',
      outputPath || videoPath.replace('.mp4', '_with_bg.mp4')
    );
    
    // Return the result
    return NextResponse.json({
      success: true,
      message: 'Video processed successfully',
      videoPath: resultPath,
      withBackground: isVideoProcessingAvailable()
    });
    
  } catch (error) {
    console.error('Error in merge-video-bg API:', error);
    return NextResponse.json({ 
      error: 'Failed to process video',
      details: error.message
    }, { status: 500 });
  }
}
