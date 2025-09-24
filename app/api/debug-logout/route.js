export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    message: "Utilisez POST pour tester la déconnexion"
  });
}

export async function POST() {
  try {
    // Simuler le processus de déconnexion côté serveur
    const result = {
      timestamp: new Date().toISOString(),
      message: "Test de déconnexion - côté serveur",
      instructions: [
        "1. Ouvrez la console du navigateur (F12)",
        "2. Collez ce code pour tester la déconnexion manuelle:",
        "",
        "// Test de déconnexion complète",
        "console.log('🚪 Début test déconnexion...');",
        "",
        "// Fonction pour lire cookies",
        "function getCookie(name) {",
        "  const value = `; ${document.cookie}`;",
        "  const parts = value.split(`; ${name}=`);",
        "  return parts.length === 2 ? parts.pop().split(';').shift() : null;",
        "}",
        "",
        "// Vérifier état actuel",
        "console.log('📋 État avant déconnexion:');",
        "console.log('  localStorage:', localStorage.getItem('admin_session') ? 'PRÉSENT' : 'ABSENT');",
        "console.log('  sessionStorage:', sessionStorage.getItem('admin_session') ? 'PRÉSENT' : 'ABSENT');",
        "console.log('  cookie:', getCookie('admin_session') ? 'PRÉSENT' : 'ABSENT');",
        "",
        "// Nettoyer tout",
        "localStorage.removeItem('admin_session');",
        "sessionStorage.removeItem('admin_session');",
        "localStorage.removeItem('last_registered_email');",
        "sessionStorage.removeItem('last_registered_email');",
        "",
        "// Supprimer cookies avec toutes les variantes",
        "document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';",
        "document.cookie = 'admin_session=; path=/; max-age=0';",
        "document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT';",
        "document.cookie = 'admin_session=; max-age=0';",
        "",
        "// Vérifier état après nettoyage",
        "console.log('📋 État après nettoyage:');",
        "console.log('  localStorage:', localStorage.getItem('admin_session') ? 'PRÉSENT' : 'ABSENT');",
        "console.log('  sessionStorage:', sessionStorage.getItem('admin_session') ? 'PRÉSENT' : 'ABSENT');",
        "console.log('  cookie:', getCookie('admin_session') ? 'PRÉSENT' : 'ABSENT');",
        "",
        "// Redirection forcée",
        "console.log('🚀 Redirection...');",
        "window.location.href = '/photobooth-ia/admin/login';",
        "",
        "3. Appuyez sur Entrée pour exécuter le code",
        "4. Observez les logs et la redirection"
      ],
      debug_info: {
        server_time: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        note: "Ce test permet de diagnostiquer pourquoi la déconnexion ne fonctionne pas"
      }
    };

    return Response.json(result);

  } catch (error) {
    return Response.json({ 
      error: 'Erreur diagnostic déconnexion', 
      details: error.message 
    }, { status: 500 });
  }
}