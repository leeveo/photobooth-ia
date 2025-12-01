import { NextResponse } from 'next/server';

/**
 * API Route pour envoyer une photo à l'imprimante via le module WCM DNP 620
 * 
 * @param {Request} request - Requête contenant l'URL de l'image et la config imprimante
 * @returns {NextResponse} - Résultat de l'impression
 */
export async function POST(request) {
  let imageUrl, printerConfig, projectId;
  
  try {
    const body = await request.json();
    imageUrl = body.imageUrl;
    printerConfig = body.printerConfig;
    projectId = body.projectId;

    // Validation des données
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL de l\'image manquante' },
        { status: 400 }
      );
    }

    if (!printerConfig || !printerConfig.ip) {
      return NextResponse.json(
        { error: 'Configuration imprimante manquante' },
        { status: 400 }
      );
    }

    console.log('🖨️ [Print API] Début impression:', {
      imageUrl: imageUrl.substring(0, 100) + '...',
      printerIp: printerConfig.ip,
      endpoint: printerConfig.endpoint,
      copies: printerConfig.copies
    });

    // 1. Récupérer l'image depuis l'URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Impossible de récupérer l'image: ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    console.log('📥 [Print API] Image récupérée:', {
      size: imageBlob.size,
      type: imageBlob.type
    });

    // 2. Préparer la requête pour le module WCM
    const formData = new FormData();
    formData.append('image', imageBlob, 'photo.jpg');
    formData.append('copies', printerConfig.copies || 1);
    if (printerConfig.format) {
      formData.append('format', printerConfig.format);
    }

    // 3. Envoyer à l'imprimante
    const printerUrl = `${printerConfig.ip}${printerConfig.endpoint || '/print'}`;
    console.log('📤 [Print API] Envoi vers:', printerUrl);

    const printResponse = await fetch(printerUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000), // Timeout 30 secondes
    });

    if (!printResponse.ok) {
      // Essayer de récupérer le message d'erreur du WCM
      let errorMessage = `Erreur imprimante (${printResponse.status})`;
      try {
        const errorData = await printResponse.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = await printResponse.text() || errorMessage;
      }

      throw new Error(errorMessage);
    }

    // 4. Log de succès (optionnel : sauvegarder dans print_logs)
    console.log('✅ [Print API] Impression réussie');

    // Si vous avez créé la table print_logs, vous pouvez enregistrer ici
    if (projectId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        await supabase.from('print_logs').insert({
          project_id: projectId,
          image_url: imageUrl,
          printer_ip: printerConfig.ip,
          status: 'success',
          metadata: {
            copies: printerConfig.copies,
            format: printerConfig.format,
            endpoint: printerConfig.endpoint
          }
        });
      } catch (logError) {
        console.error('⚠️ Erreur lors du logging:', logError);
        // Ne pas faire échouer la requête si le logging échoue
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Photo envoyée à l\'imprimante avec succès',
      copies: printerConfig.copies || 1
    });

  } catch (error) {
    console.error('❌ [Print API] Erreur:', error);

    // Log de l'erreur dans la base (optionnel)
    if (projectId && printerConfig?.ip) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        await supabase.from('print_logs').insert({
          project_id: projectId,
          image_url: imageUrl || '',
          printer_ip: printerConfig.ip,
          status: 'failed',
          error_message: error.message,
          metadata: {
            copies: printerConfig?.copies,
            format: printerConfig?.format,
            endpoint: printerConfig?.endpoint
          }
        });
      } catch (logError) {
        console.error('⚠️ Erreur lors du logging d\'erreur:', logError);
      }
    }

    return NextResponse.json(
      {
        error: error.message || 'Erreur lors de l\'impression',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
