import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  const { projectId, testEmail } = await req.json();

  if (!projectId || !testEmail) {
    return new Response(JSON.stringify({ error: 'ID du projet et email de test requis' }), {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || 'Photobooth';

  // Vérification des variables d'environnement
  if (!apiKey || !fromEmail) {
    return new Response(JSON.stringify({ error: 'Configuration email manquante' }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    // Récupérer les informations du projet et son template d'email
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Récupérer les données du projet
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Projet non trouvé');
    }

    // Récupérer le template d'email personnalisé
    const { data: emailTemplate, error: templateError } = await supabase
      .from('photobooth_emailtemplate')
      .select('subject, html_content')
      .eq('id_project', projectId)
      .maybeSingle();

    if (templateError) {
      throw new Error('Erreur lors de la récupération du template');
    }

    let subject, htmlContent;
    
    if (emailTemplate) {
      subject = emailTemplate.subject || 'Test - Template d\'email personnalisé';
      htmlContent = emailTemplate.html_content || '<p>Contenu par défaut</p>';
    } else {
      subject = 'Test - Aucun template personnalisé';
      htmlContent = '<p>Aucun template personnalisé n\'a été configuré pour ce projet.</p>';
    }

    // Remplacer les variables avec des données de test
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const testData = {
      participant_firstname: 'Jean',
      participant_lastname: 'Dupont', 
      participant_email: testEmail,
      event_name: project.name,
      event_date: new Date().toLocaleDateString('fr-FR'),
      event_location: 'Lieu de test',
      ticket_url: `${baseUrl}/test-image.svg`,
      image_url: `${baseUrl}/test-image.svg`
    };

    // Remplacer toutes les variables dans le contenu HTML
    Object.entries(testData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      htmlContent = htmlContent.replace(regex, value);
    });

    // Ajouter un en-tête indiquant qu'il s'agit d'un test
    htmlContent = `
      <div style="background-color: #FFF3CD; border: 1px solid #FFEAA7; padding: 10px; margin-bottom: 20px; border-radius: 4px;">
        <strong>🧪 EMAIL DE TEST</strong><br>
        Ceci est un test du template d'email pour le projet: <strong>${project.name}</strong><br>
        Les données ci-dessous sont fictives à des fins de démonstration.
      </div>
      ${htmlContent}
    `;

    // Envoyer l'email via Brevo
    const brevoPayload = {
      sender: { email: fromEmail, name: fromName },
      to: [{ email: testEmail }],
      subject: `[TEST] ${subject}`,
      htmlContent: htmlContent,
      replyTo: { email: fromEmail },
    };

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
      throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email de test');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email de test envoyé avec succès',
      templateFound: !!emailTemplate
    }), {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error('Erreur test email:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erreur lors de l\'envoi de l\'email de test' 
    }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
