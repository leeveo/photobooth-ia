import { createClient } from '@supabase/supabase-js';
import { replaceImageLinksInEmail } from '../../../lib/imageLinks';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req) {
  const { to, project, imageUrl, participantData, sessionId, photoId } = await req.json();

  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || project?.client_name || 'Photobooth';

  // Vérification stricte des variables d'environnement
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'BREVO_API_KEY is not set on the server.' }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
  if (!fromEmail) {
    return new Response(JSON.stringify({ error: 'BREVO_FROM_EMAIL is not set on the server.' }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Debug: log les variables côté serveur (en dev uniquement)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[BREVO DEBUG] apiKey:', apiKey ? '***' : 'MISSING');
    console.log('[BREVO DEBUG] fromEmail:', fromEmail);
    console.log('[BREVO DEBUG] fromName:', fromName);
  }

  // Récupérer le template d'email personnalisé pour ce projet
  let customTemplate = null;
  if (project?.id) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: emailTemplate, error: templateError } = await supabase
        .from('photobooth_emailtemplate')
        .select('subject, html_content')
        .eq('id_project', project.id)
        .maybeSingle();

      if (!templateError && emailTemplate) {
        customTemplate = emailTemplate;
        console.log('[EMAIL DEBUG] Template personnalisé trouvé pour le projet:', project.id);
      } else {
        console.log('[EMAIL DEBUG] Aucun template personnalisé trouvé pour le projet:', project.id);
      }
    } catch (err) {
      console.error('[EMAIL DEBUG] Erreur lors de la récupération du template:', err);
    }
  }

  // Utiliser le template personnalisé ou les valeurs par défaut
  let subject, body;
  
  if (customTemplate) {
    subject = customTemplate.subject || 'Votre photo de la séance photobooth';
    body = customTemplate.html_content || getDefaultEmailTemplate(imageUrl, project?.name || 'Photobooth');
  } else {
    subject = project?.email_subject || 'Votre photo de la séance photobooth';
    body = project?.email_body || getDefaultEmailTemplate(imageUrl, project?.name || 'Photobooth');
  }

  // Remplacer les variables dans le template
  if (participantData) {
    body = body
      .replace(/\{\{participant_firstname\}\}/g, participantData.firstname || participantData.name || '')
      .replace(/\{\{participant_lastname\}\}/g, participantData.lastname || '')
      .replace(/\{\{participant_email\}\}/g, participantData.email || to || '')
      .replace(/\{\{event_name\}\}/g, project?.name || '')
      .replace(/\{\{event_date\}\}/g, new Date().toLocaleDateString('fr-FR') || '')
      .replace(/\{\{event_location\}\}/g, project?.location || '');
  }
  
  // Option 1: Utiliser directement l'URL S3 (plus simple)
  body = body
    .replace(/\{\{image_url\}\}/g, imageUrl)
    .replace(/\{\{ticket_url\}\}/g, imageUrl)
    .replace(/\{\{photo_url\}\}/g, imageUrl);
  
  // Ajouter aussi un lien de téléchargement direct via notre API
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const downloadLink = `${baseUrl}/api/download-image?url=${encodeURIComponent(imageUrl)}&filename=photo-${participantData?.firstname || 'participant'}-${Date.now()}.jpg`;
  body = body.replace(/\{\{download_link\}\}/g, downloadLink);
  
  // Option 2: Si des liens sécurisés sont nécessaires, décommenter la section suivante
  /*
  // Remplacer les URLs d'images avec des liens sécurisés
  body = replaceImageLinksInEmail(body, {
    imageData: {
      imageUrl: imageUrl,
      sessionId: sessionId,
      photoId: photoId
    },
    participantData: participantData,
    projectData: project
  });
  */

  // Payload Brevo API v3
  const brevoPayload = {
    sender: { email: fromEmail, name: fromName },
    to: [{ email: to }],
    subject,
    htmlContent: body,
    replyTo: { email: fromEmail },
  };

  // Ajoutez un log du payload pour debug
  if (process.env.NODE_ENV !== 'production') {
    console.log('[BREVO DEBUG] payload:', brevoPayload);
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(brevoPayload),
  });

  if (!response.ok) {
    const error = await response.json();
    // Ajoutez le body de la réponse pour debug
    if (process.env.NODE_ENV !== 'production') {
      console.error('[BREVO ERROR]', error);
    }
    return new Response(JSON.stringify({ error: error.message || error || 'Erreur lors de l\'envoi de l\'email' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Fonction pour générer un template d'email par défaut attractif
function getDefaultEmailTemplate(imageUrl, eventName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Votre photo photobooth</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;">
            <tr>
                <td align="center" style="padding: 40px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                        <!-- En-tête -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">📸 Votre photo est prête !</h1>
                                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Merci d'avoir participé à notre séance photobooth</p>
                            </td>
                        </tr>
                        
                        <!-- Contenu principal -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Bonjour {{participant_firstname}},
                                </p>
                                
                                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    Votre photo de la séance <strong>{{event_name}}</strong> est maintenant disponible ! 
                                    Cliquez sur le bouton ci-dessous pour la télécharger ou la voir en grand format.
                                </p>
                                
                                <!-- Bouton d'action -->
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="{{ticket_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                        🖼️ Voir ma photo
                                    </a>
                                </div>
                                
                                <!-- Aperçu de l'image -->
                                <div style="text-align: center; margin: 30px 0;">
                                    <img src="{{image_url}}" alt="Votre photo" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                                </div>
                                
                                <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                                    💡 <strong>Astuce :</strong> N'hésitez pas à partager votre photo sur vos réseaux sociaux !
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Pied de page -->
                        <tr>
                            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                                <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">
                                    Événement : <strong>{{event_name}}</strong>
                                </p>
                                <p style="color: #6c757d; font-size: 14px; margin: 0;">
                                    Date : {{event_date}}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `;
}