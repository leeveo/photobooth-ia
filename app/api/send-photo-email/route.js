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
  const { to, project, imageUrl } = await req.json();

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

  const subject = project?.email_subject || 'Votre photo de la séance photobooth';
  const body = (project?.email_body || `Bonjour,<br><br>Voici votre photo générée lors de la séance photobooth.<br><br><a href="${imageUrl}" target="_blank">Voir ma photo</a><br><br>Merci !`).replace('{{image_url}}', imageUrl);

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