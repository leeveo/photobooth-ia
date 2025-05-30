import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'

// Configurer pour utiliser Edge Runtime afin de réduire la taille
export const config = {
  runtime: 'edge'
};

// Remplacer toute la fonction existante par une version simplifiée
export async function POST(req: Request) {
  try {
    const { step } = await req.json();
    
    // Réponses simulées en fonction de l'étape
    if (step === 1) {
      return new Response(
        JSON.stringify({
          message: "Fonction désactivée sur Vercel: FFmpeg n'est pas disponible en production",
          blackBgImage: `/placeholder-images/fresque_black_bg.png`,
          totalWidth: 1280,
          maxHeight: 720,
          uploaded: [],
          transparentFromStep1: true
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } 
    else if (step === 2) {
      return new Response(
        JSON.stringify({
          message: "Fonction désactivée sur Vercel: FFmpeg n'est pas disponible en production",
          transparentImage: `/placeholder-images/fresque_transparent.png`,
          uploaded: []
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    else if (step === 3) {
      return new Response(
        JSON.stringify({
          message: "Fonction désactivée sur Vercel: FFmpeg n'est pas disponible en production",
          video: `/placeholder-images/fresque_scroll.mp4`
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    else {
      return new Response(
        JSON.stringify({
          error: "Fonction désactivée sur Vercel: FFmpeg n'est pas disponible en production"
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Erreur serveur lors du traitement de la demande",
        details: err instanceof Error ? err.message : String(err)
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
