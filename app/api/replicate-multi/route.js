import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request) {
  try {
    console.log("Multi-image Replicate API request received");
    
    // Parse the request body
    const body = await request.json();
    console.log("Request body received with model:", body.model);
    
    // Validate the required fields
    if (!body.model) {
      return NextResponse.json(
        { success: false, error: "Missing required field: model" },
        { status: 400 }
      );
    }
    
    if (!body.input) {
      return NextResponse.json(
        { success: false, error: "Missing required field: input" },
        { status: 400 }
      );
    }
    
    // Special validation for multi-image model
    const { input } = body;
    
    if (!input.input_image_1) {
      console.error("Missing or invalid input_image_1");
      return NextResponse.json(
        { success: false, error: "Missing or invalid input_image_1" },
        { status: 400 }
      );
    }
    
    if (!input.input_image_2) {
      console.error("Missing or invalid input_image_2");
      return NextResponse.json(
        { success: false, error: "Missing or invalid input_image_2" },
        { status: 400 }
      );
    }
    
    if (!input.prompt) {
      console.error("Missing prompt");
      return NextResponse.json(
        { success: false, error: "Missing prompt" },
        { status: 400 }
      );
    }
    
    console.log("All parameters validated, creating Replicate client");
    
    // Initialize Replicate client
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    console.log("Sending prediction to Replicate with model:", body.model);
    console.log("Input parameters:", {
      prompt: input.prompt,
      aspect_ratio: input.aspect_ratio || "3:2",
      // Don't log full image data to avoid console overload
      input_image_1: input.input_image_1 ? "Base64 image present" : "Missing",
      input_image_2: input.input_image_2 ? "Image URL present" : "Missing",
    });
    
    // Call Replicate API
    const output = await replicate.run(body.model, {
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio || "3:2",
        input_image_1: input.input_image_1,
        input_image_2: input.input_image_2,
        width: input.width || 970,
        height: input.height || 651
      }
    });
    
    console.log("Prediction completed successfully");
    
    // Return successful response
    return NextResponse.json({
      success: true,
      output: output
    });
    
  } catch (error) {
    console.error("Error in Replicate API:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Error processing request",
        details: error.stack
      },
      { status: 500 }
    );
  }
}
