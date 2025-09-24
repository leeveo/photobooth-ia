// Solution temporaire : Mode développement en production
// Modifier temporairement l'API google-token-exchange pour permettre les tests

export async function POST(request: Request) {
  console.log('🔄 [TEMP] API google-token-exchange - Mode développement');
  
  try {
    const body = await request.json();
    const { code } = body;
    
    console.log('📥 Code reçu:', code ? `${code.substring(0, 10)}...` : 'ABSENT');
    
    // ⚠️ SOLUTION TEMPORAIRE : Simuler une session utilisateur valide
    // TODO: Retirer cette simulation une fois OAuth Google configuré
    if (code && code.startsWith('4/0')) {
      console.log('🧪 [TEMP] Simulation d\'une session valide');
      
      const fakeUser = {
        id: 'temp-user-' + Date.now(),
        email: 'test@example.com',
        name: 'Utilisateur Test',
        picture: 'https://via.placeholder.com/150'
      };
      
      return new Response(JSON.stringify({
        success: true,
        user: fakeUser,
        message: '[TEMP] Session simulée - Configuration OAuth Google requise'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Code OAuth invalide',
      details: 'Format de code non reconnu'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Erreur API temporaire:', error);
    return new Response(JSON.stringify({
      error: 'Erreur serveur temporaire',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(request: Request) {
  return new Response(JSON.stringify({
    message: 'API google-token-exchange temporaire',
    status: 'Mode développement - Configuration OAuth Google requise',
    instructions: 'Voir GOOGLE_OAUTH_CONFIG_GUIDE.md'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}