import { NextResponse } from 'next/server';
import Replicate from 'replicate';

// Set a reasonable timeout for Replicate API calls
const REPLICATE_TIMEOUT = 60000; // 60 seconds

export async function POST(request) {
  const startTime = Date.now();
  console.log("Replicate API request received");
  
  try {
    // Vérifier que le corps de la requête est valide
    let body;
    try {
      body = await request.json();
      console.log("Request body received with model:", body.model);
    } catch (e) {
      console.error("Invalid JSON format:", e.message);
      return NextResponse.json({ 
        success: false, 
        error: "Format JSON invalide" 
      }, { status: 400 });
    }
    
    const { model, input, version } = body;
    
    // Vérifier les paramètres requis
    if (!model) {
      console.error("Missing 'model' parameter");
      return NextResponse.json({ 
        success: false, 
        error: "Le paramètre 'model' est requis" 
      }, { status: 400 });
    }
    
    if (!input || typeof input !== 'object') {
      console.error("Invalid 'input' parameter");
      return NextResponse.json({ 
        success: false, 
        error: "Le paramètre 'input' doit être un objet" 
      }, { status: 400 });
    }
    
    // Check that prompt is provided for flux-kontext-pro
    if (model.includes("flux-kontext-pro") && (!input.prompt || typeof input.prompt !== 'string')) {
      console.error("Missing or invalid prompt for flux-kontext-pro");
      return NextResponse.json({
        success: false,
        error: "Un prompt textuel est requis pour le modèle flux-kontext-pro"
      }, { status: 400 });
    }

    // Ajout de logs pour les images
    console.log("input_image_1:", input.input_image_1 ? input.input_image_1.substring(0, 30) + "..." : "absent");
    console.log("input_image_2:", input.input_image_2 ? input.input_image_2.substring(0, 30) + "..." : "absent");

    // Pour le modèle black-forest-labs/flux-kontext-pro, ne pas valider input_image_1 ou input_image_2
    if (model === "black-forest-labs/flux-kontext-pro") {
      console.log("input_image_1 et input_image_2 ne sont pas requis pour ce modèle.");
    } else if (model.includes("flux-kontext-pro")) {
      // Pour les autres variantes de flux-kontext-pro, input_image_1 est requis
      if (!input.input_image_1 || !input.input_image_1.startsWith('data:image')) {
        console.error("Missing or invalid input_image_1 for flux-kontext-pro");
        return NextResponse.json({
          success: false,
          error: "Une image d'entrée valide est requise pour input_image_1 (format base64) pour flux-kontext-pro"
        }, { status: 400 });
      }
    } else {
      // Pour les autres modèles, log mais ne bloque pas
      if (!input.input_image_1) {
        console.warn("input_image_1 is absent for model:", model);
      } else if (!input.input_image_1.startsWith('data:image')) {
        console.warn("input_image_1 is not base64 for model:", model);
      }
    }

    // input_image_2: log et validation si présent
    if (input.input_image_2) {
      if (!input.input_image_2.startsWith('data:image') && !input.input_image_2.startsWith('http')) {
        console.error("Invalid input_image_2");
        return NextResponse.json({
          success: false,
          error: "input_image_2 doit être une URL publique ou une image base64"
        }, { status: 400 });
      }
    } else {
      console.warn("input_image_2 is absent");
    }
    
    // Vérifier le token Replicate
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("REPLICATE_API_TOKEN is not set");
      return NextResponse.json({
        success: false,
        error: "Configuration API manquante (REPLICATE_API_TOKEN)"
      }, { status: 500 });
    }
    
    // Initialiser le client Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    // Prepare and log the options
    const options = { input };
    if (version) {
      options.version = version;
    }
    
    console.log(`Calling Replicate with model: ${model}`);
    console.log("Input parameters:", JSON.stringify({
      ...input,
      input_image_1: input.input_image_1 ? "base64_data_present" : "missing",
      input_image_2: input.input_image_2 ? "url_or_base64_present" : "missing"
    }));
    
    // Make the Replicate API call
    try {
      const output = await replicate.run(model, options);
      
      console.log(`Replicate API success in ${Date.now() - startTime}ms`);
      console.log("Output received:", output);
      
      return NextResponse.json({ 
        success: true, 
        output,
        processingTime: Date.now() - startTime
      });
    } catch (replicateError) {
      console.error("Replicate API error:", replicateError);
      
      // Try to extract detailed error information
      let errorMessage = replicateError.message || "Unknown Replicate error";
      let errorDetails = null;
      
      try {
        if (replicateError.response) {
          const responseText = await replicateError.response.text();
          errorDetails = responseText;
          console.error("Replicate error response:", responseText);
        }
      } catch (e) {
        console.error("Error parsing Replicate error response:", e);
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: errorDetails
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`Replicate API request error after ${Date.now() - startTime}ms:`, error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Unexpected error processing request" 
    }, { status: 500 });
  }
}