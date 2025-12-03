import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const GEMINI_TIMEOUT = 60000; // 60 seconds

export async function POST(request) {
  const startTime = Date.now();
  console.log("Gemini API request received");
  
  try {
    // Vérifier que le corps de la requête est valide
    let body;
    try {
      body = await request.json();
      console.log("Request body received");
    } catch (e) {
      console.error("Invalid JSON format:", e.message);
      return NextResponse.json({ 
        success: false, 
        error: "Format JSON invalide" 
      }, { status: 400 });
    }
    
    const { prompt, image, input, reference_image } = body;
    
    // Vérifier les paramètres requis
    if (!prompt || typeof prompt !== 'string') {
      console.error("Missing or invalid 'prompt' parameter");
      return NextResponse.json({ 
        success: false, 
        error: "Le paramètre 'prompt' est requis et doit être une chaîne de caractères" 
      }, { status: 400 });
    }
    
    // Pour compatibilité avec l'ancien système, extraire l'image depuis input si disponible
    let imageData = image;
    if (!imageData && input) {
      // Tenter d'extraire l'image depuis différents champs possibles
      imageData = input.input_image || input.input_image_1 || input.image_input;
      
      // Si image_input est un array, prendre le premier élément
      if (Array.isArray(imageData)) {
        imageData = imageData[0];
      }
    }

    // Extraire l'image de référence si disponible
    let referenceImageData = reference_image;
    if (!referenceImageData && input) {
      referenceImageData = input.reference_image;
    }
    
    // Si l'image de référence est une URL, la télécharger et la convertir en base64
    if (referenceImageData && referenceImageData.startsWith('http')) {
      try {
        console.log(`Downloading reference image from URL: ${referenceImageData}`);
        const imageResponse = await fetch(referenceImageData);
        if (!imageResponse.ok) {
          console.error(`Failed to download reference image: ${imageResponse.status} ${imageResponse.statusText}`);
        } else {
          const arrayBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
          referenceImageData = `data:${contentType};base64,${buffer.toString('base64')}`;
          console.log(`Successfully converted reference image URL to base64 (${referenceImageData.length} chars)`);
        }
      } catch (downloadError) {
        console.error("Error downloading reference image:", downloadError);
        // On continue sans l'image de référence si le téléchargement échoue
        referenceImageData = null;
      }
    }

    if (!imageData || !imageData.startsWith('data:image')) {
      console.error("Missing or invalid image data");
      return NextResponse.json({
        success: false,
        error: "Une image valide est requise (format base64)"
      }, { status: 400 });
    }
    
    // Vérifier le token Gemini
    if (!process.env.GEMINI || process.env.GEMINI === 'REMPLACER_PAR_NOUVELLE_CLE_GEMINI') {
      console.error("GEMINI API key is not set or is placeholder");
      return NextResponse.json({
        success: false,
        error: "Configuration API manquante (GEMINI) - Clé API non configurée"
      }, { status: 500 });
    }
    
    // Initialiser le client Gemini
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI
    });
    
    // Extraire les données base64 de l'image principale
    const base64Match = imageData.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);
    if (!base64Match) {
      console.error("Invalid base64 image format");
      return NextResponse.json({
        success: false,
        error: "Format d'image base64 invalide"
      }, { status: 400 });
    }
    
    const [, mimeType, base64Data] = base64Match;
    const fullMimeType = `image/${mimeType}`;
    
    console.log(`Processing image with mime type: ${fullMimeType}`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`Image data length: ${base64Data.length}`);

    // Préparer le prompt pour Gemini
    const geminiPrompt = [];

    // Ajouter l'image principale (Utilisateur) en PREMIER
    geminiPrompt.push({
      inlineData: {
        mimeType: fullMimeType,
        data: base64Data,
      },
    });

    // Ajouter l'image de référence (Style) en SECOND
    if (referenceImageData && referenceImageData.startsWith('data:image')) {
      const refBase64Match = referenceImageData.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);
      if (refBase64Match) {
        const [, refMimeType, refBase64Data] = refBase64Match;
        const refFullMimeType = `image/${refMimeType}`;
        console.log(`Adding reference image (second) with mime type: ${refFullMimeType}`);
        
        geminiPrompt.push({
          inlineData: {
            mimeType: refFullMimeType,
            data: refBase64Data,
          },
        });
      }
    }

    // Ajouter le texte du prompt
    geminiPrompt.push({ text: prompt });
    
    try {
      console.log("Calling Gemini API...");
      
      // Faire l'appel à l'API Gemini
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: geminiPrompt,
      });
      
      console.log(`Gemini API success in ${Date.now() - startTime}ms`);
      console.log("Response received, analyzing structure...");
      
      // Vérifier si la réponse existe
      if (!response || !response.candidates || !response.candidates[0]) {
        console.error("Invalid response structure from Gemini - no candidates");
        console.log("Full response:", JSON.stringify(response, null, 2));
        return NextResponse.json({
          success: false,
          error: "Structure de réponse invalide de Gemini - pas de candidats"
        }, { status: 500 });
      }
      
      if (!response.candidates[0].content || !response.candidates[0].content.parts) {
        console.error("Invalid response structure from Gemini - no content parts");
        console.log("Candidate structure:", JSON.stringify(response.candidates[0], null, 2));
        return NextResponse.json({
          success: false,
          error: "Structure de réponse invalide de Gemini - pas de contenu"
        }, { status: 500 });
      }
      
      // Extraire l'image générée de la réponse
      let generatedImageData = null;
      let textResponse = null;
      
      console.log(`Found ${response.candidates[0].content.parts.length} parts in response`);
      
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          textResponse = part.text;
          console.log("Text response received:", part.text.substring(0, 100) + "...");
        } else if (part.inlineData) {
          generatedImageData = part.inlineData.data;
          console.log("Image data received, length:", generatedImageData.length);
        }
      }
      
      if (generatedImageData) {
        // Convertir en format compatible avec l'ancien système
        const imageUrl = `data:image/png;base64,${generatedImageData}`;
        
        return NextResponse.json({ 
          success: true, 
          output: [imageUrl], // Format tableau pour compatibilité avec Replicate
          textResponse,
          processingTime: Date.now() - startTime,
          source: 'gemini'
        });
      } else if (textResponse) {
        console.log("Only text response received, no image generated");
        return NextResponse.json({ 
          success: false, 
          error: "Gemini a retourné seulement du texte, pas d'image générée",
          textResponse,
          processingTime: Date.now() - startTime
        });
      } else {
        console.log("No valid content found in response");
        return NextResponse.json({ 
          success: false, 
          error: "Aucune réponse valide de Gemini",
          processingTime: Date.now() - startTime,
          fullResponse: JSON.stringify(response, null, 2)
        });
      }
      
    } catch (geminiError) {
      console.error("Gemini API error:", geminiError);
      console.error("Error message:", geminiError.message);
      console.error("Error cause:", geminiError.cause);
      console.error("Error stack:", geminiError.stack);
      
      let errorMessage = geminiError.message || "Unknown Gemini error";
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: geminiError.toString(),
        processingTime: Date.now() - startTime
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error(`Gemini API request error after ${Date.now() - startTime}ms:`, error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Unexpected error processing request",
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
}
