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

  const apiKey = process.env.MAILERSEND_API_KEY;
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL;
  const fromName = process.env.MAILERSEND_FROM_NAME || project?.client_name || 'Photobooth';

  // Vérification stricte des variables d'environnement
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'MAILERSEND_API_KEY is not set on the server.' }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
  if (!fromEmail) {
    return new Response(JSON.stringify({ error: 'MAILERSEND_FROM_EMAIL is not set on the server.' }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Debug: log les variables côté serveur (en dev uniquement)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[MAILERSEND DEBUG] apiKey:', apiKey ? '***' : 'MISSING');
    console.log('[MAILERSEND DEBUG] fromEmail:', fromEmail);
    console.log('[MAILERSEND DEBUG] fromName:', fromName);
  }

  const subject = project?.email_subject || 'Votre photo de la séance photobooth';
  const body = (project?.email_body || `Bonjour,<br><br>Voici votre photo générée lors de la séance photobooth.<br><br><a href="${imageUrl}" target="_blank">Voir ma photo</a><br><br>Merci !`).replace('{{image_url}}', imageUrl);

  // Ajoutez le champ "reply_to" et "domain_id" si besoin
  // Correction : testez l'envoi avec un "from" qui correspond exactement à un expéditeur validé dans MailerSend
  // et vérifiez que le domaine utilisé est bien validé et actif dans MailerSend.
  // Pour les comptes en mode "trial", l'adresse destinataire doit être autorisée dans MailerSend.

  // Si vous êtes en mode "sandbox" ou "trial", essayez d'envoyer uniquement à l'email admin déclaré dans MailerSend.
  // Pour debug, ajoutez le log du domaine utilisé :
  if (process.env.NODE_ENV !== 'production') {
    console.log('[MAILERSEND DEBUG] domain_id:', process.env.MAILERSEND_DOMAIN_ID);
  }

  const mailerPayload = {
    from: { email: fromEmail, name: fromName },
    to: [{ email: to }],
    subject,
    html: body,
    reply_to: [{ email: fromEmail }],
    domain_id: process.env.MAILERSEND_DOMAIN_ID,
  };

  // Nettoyez le payload pour ne pas envoyer de champs undefined
  Object.keys(mailerPayload).forEach(
    (key) => (mailerPayload[key] === undefined) && delete mailerPayload[key]
  );

  // Ajoutez un log du payload pour debug
  if (process.env.NODE_ENV !== 'production') {
    console.log('[MAILERSEND DEBUG] payload:', mailerPayload);
  }

  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(mailerPayload),
  });

  if (!response.ok) {
    const error = await response.json();
    // Ajoutez le body de la réponse pour debug
    if (process.env.NODE_ENV !== 'production') {
      console.error('[MAILERSEND ERROR]', error);
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
