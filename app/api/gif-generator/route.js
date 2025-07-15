import { NextResponse } from 'next/server';
import { isGifGenerationSupported } from '../../../utils/feature-detection';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Check if GIF generation is supported in this environment
    if (!isGifGenerationSupported()) {
      return NextResponse.json(
        { 
          error: true, 
          message: "La génération de GIF n'est pas disponible dans cet environnement." 
        }, 
        { status: 501 }
      );
    }
    
    // Only dynamically import the needed modules if supported
    let GIFEncoder, Canvas;
    try {
      GIFEncoder = (await import('gifencoder')).default;
      Canvas = await import('canvas');
    } catch (err) {
      console.error("Failed to load GIF encoder or Canvas:", err);
      return NextResponse.json(
        { error: true, message: "Module de génération GIF non disponible" }, 
        { status: 500 }
      );
    }
    
    // Process the GIF generation request here
    // This is where your original GIF generation code would go
    
    return NextResponse.json({ success: true, message: "GIF generation completed" });
  } catch (error) {
    console.error("GIF generation error:", error);
    return NextResponse.json(
      { error: true, message: error.message || "Une erreur est survenue" }, 
      { status: 500 }
    );
  }
}
