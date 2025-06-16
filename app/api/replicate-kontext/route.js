import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST endpoint to create a new prediction with Replicate
 */
export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Parse request body
    const { prompt, image, projectId, model, options } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({
        success: false,
        message: 'Prompt is required'
      }, { status: 400 });
    }
    
    // Get the Replicate API token from environment variables
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({
        success: false,
        message: 'Replicate API token not configured'
      }, { status: 500 });
    }
    
    // Default model or the one provided
    const modelVersion = model || "kontext/kontext:2b018a9ed96221eb55dcb9a807a7eb5b9c3b8f0bdb98c9b631c28c346ca4a85d";
    
    // Prepare the input for Replicate API
    const input = {
      prompt: prompt,
      ...(image && { image: image }),
      ...(options || {})
    };
    
    // Call Replicate API to create a prediction
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: modelVersion,
        input: input,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Replicate API error: ${error.detail}`);
    }
    
    const prediction = await response.json();
    
    // Save prediction to database if projectId is provided
    if (projectId) {
      const { error } = await supabase
        .from('replicate_predictions')
        .insert([{
          project_id: projectId,
          prediction_id: prediction.id,
          prompt: prompt,
          model: modelVersion,
          status: prediction.status,
          created_at: new Date(),
          created_by: session.user.id,
          input: input
        }]);
      
      if (error) {
        console.error('Error saving prediction details:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      prediction: prediction
    });
    
  } catch (error) {
    console.error('Error creating Replicate prediction:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create prediction',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check the status of a prediction
 */
export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const predictionId = url.searchParams.get('id');
    
    if (!predictionId) {
      return NextResponse.json({
        success: false,
        message: 'Prediction ID is required'
      }, { status: 400 });
    }
    
    // Get the Replicate API token from environment variables
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({
        success: false,
        message: 'Replicate API token not configured'
      }, { status: 500 });
    }
    
    // Call Replicate API to get prediction status
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Replicate API error: ${error.detail}`);
    }
    
    const prediction = await response.json();
    
    // Update prediction status in database if completed
    if (prediction.status === 'succeeded' || prediction.status === 'failed') {
      const { error } = await supabase
        .from('replicate_predictions')
        .update({
          status: prediction.status,
          output: prediction.output,
          completed_at: new Date()
        })
        .eq('prediction_id', predictionId);
      
      if (error) {
        console.error('Error updating prediction status:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      prediction: prediction
    });
    
  } catch (error) {
    console.error('Error checking Replicate prediction:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check prediction',
      error: error.message
    }, { status: 500 });
  }
}
