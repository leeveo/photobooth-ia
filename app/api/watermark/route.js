import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { applyWatermarkWithCanvas } from '../../utils/watermarkUtils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('imageUrl');
    const projectId = searchParams.get('projectId');
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Récupérer les données du projet
    const supabase = createRouteHandlerClient({ cookies });
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Récupérer les éléments du filigrane avancé
    let watermarkElements = null;
    if (projectData.watermark_elements) {
      try {
        watermarkElements = JSON.parse(projectData.watermark_elements);
      } catch (e) {
        console.error('Error parsing watermark elements:', e);
      }
    }
    
    // Si le filigrane est désactivé ou s'il n'y a pas d'éléments, retourner l'image originale
    if (!projectData.watermark_enabled || !Array.isArray(watermarkElements) || watermarkElements.length === 0) {
      const originalResponse = await fetch(imageUrl);
      const originalBuffer = Buffer.from(await originalResponse.arrayBuffer());
      
      return new NextResponse(originalBuffer, {
        status: 200,
        headers: {
          'Content-Type': originalResponse.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
    
    // Appliquer le filigrane
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    
    // Charger l'image dans une instance de Node Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Créer une image à partir du blob
    const img = new Image();
    img.src = URL.createObjectURL(imageBlob);
    
    await new Promise(resolve => {
      img.onload = resolve;
    });
    
    // Configurer le canvas
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    // Appliquer les éléments du filigrane avancé
    for (const element of watermarkElements) {
      if (element.type === 'text') {
        ctx.font = `${element.fontSize}px ${element.fontFamily || 'Arial'}`;
        ctx.fillStyle = element.color || '#FFFFFF';
        ctx.fillText(element.text, element.x, element.y);
      }
      else if (element.type === 'logo' && element.src) {
        try {
          // Charger le logo
          const logoImage = new Image();
          logoImage.crossOrigin = 'Anonymous';
          logoImage.src = element.src;
          
          await new Promise(resolve => {
            logoImage.onload = resolve;
            logoImage.onerror = () => {
              console.error('Erreur de chargement du logo de filigrane');
              resolve();
            };
          });
          
          ctx.globalAlpha = element.opacity || 1.0;
          ctx.drawImage(logoImage, element.x, element.y, element.width || 100, element.height || 100);
          ctx.globalAlpha = 1.0;
        } catch (error) {
          console.error('Erreur lors de l\'application du logo:', error);
        }
      }
    }
    
    // Convertir le canvas en blob
    const watermarkedBlob = await new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
    });
    
    // Convertir le blob en buffer
    const watermarkedBuffer = Buffer.from(await watermarkedBlob.arrayBuffer());
    
    return new NextResponse(watermarkedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error processing watermark:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
