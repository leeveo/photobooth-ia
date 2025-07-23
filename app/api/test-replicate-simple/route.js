import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function GET() {
  try {
    console.log("Testing Replicate API token with simple request...");
    
    // Vérifier que le token Replicate est défini
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("REPLICATE_API_TOKEN is not set");
      return NextResponse.json({ 
        valid: false, 
        error: "REPLICATE_API_TOKEN is missing" 
      }, { status: 500 });
    }
    
    // Initialiser le client Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    // Test très simple: juste un petit appel pour voir si l'authentification fonctionne
    // Utilisons la fonction de prédiction avec un modèle très simple et une requête minimale
    const prediction = await replicate.predictions.create({
      version: "5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa",
      input: {
        text: "Hello, world!"
      }
    });
    
    return NextResponse.json({ 
      valid: true, 
      message: "Le token Replicate API est valide",
      prediction_id: prediction.id
    });
    
  } catch (error) {
    console.error("Error testing Replicate API:", error);
    
    // Analyse de l'erreur pour déterminer si c'est un problème d'authentification
    const errorMessage = error.message || "Unknown error";
    const isAuthError = errorMessage.toLowerCase().includes('auth') || 
                       errorMessage.toLowerCase().includes('token') || 
                       errorMessage.toLowerCase().includes('unauthorized');
    
    return NextResponse.json({ 
      valid: false, 
      error: errorMessage,
      details: error.toString(),
      recommendation: isAuthError 
        ? "Votre token API Replicate semble invalide. Vérifiez-le dans votre tableau de bord Replicate."
        : "Erreur technique non liée à l'authentification. Vérifiez les logs serveur."
    }, { status: 500 });
  }
}
