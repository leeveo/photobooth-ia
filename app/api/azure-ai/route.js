import { NextResponse } from 'next/server';

// Configuration Azure AI Foundry - CORRECTION avec le bon endpoint
const AZURE_AI_KEY = "84Lv7flCqhVehC79RpaLlZ18KpMd5I6HqDkKmJANsNPRDz3t8dAiJQQJ99BIAC5T7U2XJ3w3AAAAACOGsZ92";
const AZURE_AI_BASE_ENDPOINT = "https://photoboothia-resource.cognitiveservices.azure.com/openai/deployments/FLUX.1-Kontext-pro/images";
const API_VERSION = "2025-04-01-preview";

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

    // ✅ UTILISER L'ENDPOINT /EDITS POUR IMAGE-TO-IMAGE (basé sur le code Azure officiel)
    const editsEndpoint = `${AZURE_AI_BASE_ENDPOINT}/edits?api-version=${API_VERSION}`;

    // Convertir l'image base64 en Blob pour l'upload
    const base64Data = input.input_image.split(',')[1]; // Enlever le préfixe data:image/...
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Préparer FormData pour l'upload d'image (comme dans l'exemple Azure)
    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image', imageBlob, 'input_image.jpg');
    formData.append('prompt', input.prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('output_format', 'png'); // Format correct selon l'exemple Azure

    console.log("Utilisation de l'endpoint EDITS Azure AI pour image-to-image");
    console.log("Endpoint:", editsEndpoint);
    console.log("Form data préparée avec image et prompt");

    // Call Azure AI API avec l'endpoint /edits et FormData
    const response = await fetch(editsEndpoint, {
      method: 'POST',
      headers: {
        'api-key': AZURE_AI_KEY,
        // Ne pas ajouter Content-Type pour FormData, le navigateur le fera automatiquement
        'User-Agent': 'PhotoboothIA/1.0'
      },
      body: formData
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

    // Extract result from Azure EDITS response
    let imageUrl = null;
    
    // Azure AI edits response avec output_format=png retourne b64_json
    if (data.data && Array.isArray(data.data) && data.data[0] && data.data[0].b64_json) {
      imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      console.log("Azure AI EDIT image extracted as base64 (length:", data.data[0].b64_json.length, ")");
    }
    // Fallback formats
    else if (data.data && Array.isArray(data.data) && data.data[0] && data.data[0].url) {
      imageUrl = data.data[0].url;
    } 
    else if (data.url) {
      imageUrl = data.url;
    } else if (data.image_url) {
      imageUrl = data.image_url;
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
