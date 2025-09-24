import { NextResponse } from 'next/server';

// Marquer cette route comme dynamique pour éviter l'erreur de rendu statique
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'image.jpg';

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL d\'image requise' }, { status: 400 });
    }

    // Récupérer l'image
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Image non accessible' }, { status: 404 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const headers = new Headers({
      'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': imageBuffer.byteLength.toString(),
    });

    return new NextResponse(imageBuffer, { headers });

  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'image:', error);
    return NextResponse.json({ error: 'Erreur lors du téléchargement' }, { status: 500 });
  }
}
