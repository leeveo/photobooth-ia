import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Check if we're in production environment
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      // Return a friendly error for Vercel production environment
      return NextResponse.json(
        { 
          error: true, 
          message: "La génération de GIF n'est pas disponible en production sur Vercel en raison de limitations techniques." 
        }, 
        { status: 501 }
      );
    }
    
    // Try to import GIF dependencies dynamically
    let GIFEncoder;
    try {
      GIFEncoder = (await import('gifencoder')).default;
    } catch (err) {
      console.error("Failed to load GIF encoder:", err);
      return NextResponse.json(
        { error: true, message: "Module de génération GIF non disponible" }, 
        { status: 500 }
      );
    }
    
    // Continue with the original implementation if imports succeed
    // ...

    return NextResponse.json({ success: true, gifUrl: "url-to-gif" });
  } catch (error) {
    console.error("GIF generation error:", error);
    return NextResponse.json(
      { error: true, message: error.message || "Une erreur est survenue" }, 
      { status: 500 }
    );
  }
}
