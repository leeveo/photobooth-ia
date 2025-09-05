import { NextResponse } from 'next/server';

// Configuration Azure AI Foundry
const AZURE_AI_KEY = "84Lv7flCqhVehC79RpaLlZ18KpMd5I6HqDkKmJANsNPRDz3t8dAiJQQJ99BIAC5T7U2XJ3w3AAAAACOGsZ92";
const AZURE_AI_ENDPOINT = "https://photoboothia-resource.services.ai.azure.com/openai/deployments/FLUX.1-Kontext-pro/images/generations?api-version=2025-04-01-preview";

export async function POST(request) {
  const startTime = Date.now();
  console.log("Azure AI API request received");
  
  try {
    // Parse request body
    const body = await request.json();
    console.log("Request body received for Azure AI");
    
    const { input } = body;
    
    // Validate required parameters
    if (!input || !input.prompt || !input.input_image) {
      return NextResponse.json({ 
        success: false, 
        error: "Prompt et image d'entrée requis" 
      }, { status: 400 });
    }

    console.log("input_image:", input.input_image.substring(0, 30) + "...");
    console.log("prompt:", input.prompt);

    // ✅ FLUX.1-Kontext-pro payload format for Azure AI Foundry
    const fluxPayload = {
      prompt: input.prompt,
      input_image: input.input_image, // Full base64 with prefix
      output_format: "jpg",
      width: 970,
      height: 651,
      num_images: 1,
      guidance_scale: 7.5,
      num_inference_steps: 28
    };

    console.log("Calling Azure AI FLUX with payload:", {
      prompt: fluxPayload.prompt,
      output_format: fluxPayload.output_format,
      width: fluxPayload.width,
      height: fluxPayload.height,
      has_input_image: !!fluxPayload.input_image,
      guidance_scale: fluxPayload.guidance_scale,
      num_inference_steps: fluxPayload.num_inference_steps
    });

    // Call Azure AI API
    const response = await fetch(AZURE_AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_AI_KEY,
        'User-Agent': 'PhotoboothIA/1.0'
      },
      body: JSON.stringify(fluxPayload)
    });

    console.log(`Azure AI response status: ${response.status}`);
    console.log(`Azure AI response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure AI FLUX API error:", response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `Erreur Azure AI (${response.status}): ${errorText}`
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`Azure AI success in ${Date.now() - startTime}ms`);
    console.log("Azure AI response data:", JSON.stringify(data, null, 2));

    // Extract image URL from Azure response
    let imageUrl = null;
    
    if (data.data && Array.isArray(data.data) && data.data[0] && data.data[0].url) {
      imageUrl = data.data[0].url;
    } else if (data.url) {
      imageUrl = data.url;
    } else if (data.image_url) {
      imageUrl = data.image_url;
    } else if (typeof data === 'string' && data.startsWith('http')) {
      imageUrl = data;
    }

    if (!imageUrl) {
      console.error("No image URL found in Azure response:", data);
      return NextResponse.json({
        success: false,
        error: "Aucune URL d'image dans la réponse Azure"
      }, { status: 500 });
    }

    console.log("Azure AI image URL extracted:", imageUrl);

    return NextResponse.json({
      success: true,
      output: imageUrl,
      processing_time: Date.now() - startTime,
      source: 'azure-ai'
    });

  } catch (error) {
    console.error("Azure AI API internal error:", error);
    return NextResponse.json({
      success: false,
      error: `Erreur interne Azure AI: ${error.message}`
    }, { status: 500 });
  }
}
