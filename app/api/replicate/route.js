import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Vérifier que le corps de la requête est valide
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        error: "Format JSON invalide" 
      }, { status: 400 });
    }
    
    const { model, input } = body;
    
    // Vérifier les paramètres requis
    if (!model) {
      return NextResponse.json({ 
        success: false, 
        error: "Le paramètre 'model' est requis" 
      }, { status: 400 });
    }
    
    if (!input || typeof input !== 'object') {
      return NextResponse.json({ 
        success: false, 
        error: "Le paramètre 'input' doit être un objet" 
      }, { status: 400 });
    }
    
    // Initialiser le client Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    // Appeler l'API Replicate
    console.log("Calling Replicate with model:", model);
    const output = await replicate.run(model, { input });
    
    console.log(`Replicate API success in ${Date.now() - startTime}ms`);
    return NextResponse.json({ success: true, output });
    
  } catch (error) {
    console.error(`Replicate API error after ${Date.now() - startTime}ms:`, error);
    
    // Gérer les différents types d'erreurs
    if (error.response) {
      try {
        const errorBody = await error.response.text();
        return NextResponse.json({ 
          success: false, 
          error: error.message,
          statusCode: error.response.status,
          details: errorBody
        }, { status: error.response.status });
      } catch (e) {
        return NextResponse.json({ 
          success: false, 
          error: error.message
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
  }
}