import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    // Récupérer les headers pour voir s'il y a des infos de session
    const userAgent = req.headers.get('user-agent');
    
    return NextResponse.json({
      message: 'Debug endpoint actif',
      userAgent,
      timestamp: new Date().toISOString(),
      instructions: [
        'Ouvrez la console de votre navigateur (F12)',
        'Tapez: localStorage.getItem("admin_session")',
        'Ou tapez: sessionStorage.getItem("admin_session")',
        'Copiez le résultat et décodez-le avec atob() pour voir l\'admin connecté'
      ]
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}