```javascript
// Ajouter en haut du fichier pour utiliser Edge Runtime
export const config = {
  runtime: 'edge'
};

// Simplifier la fonction pour éviter l'excès de taille
export async function POST(req) {
  try {
    // Vérifier si nous sommes en production
    const isProd = process.env.NODE_ENV === 'production';
    
    if (isProd) {
      // Version allégée pour Vercel
      return new Response(
        JSON.stringify({ 
          message: "Cette fonctionnalité n'est pas disponible en production",
          success: false
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // ...code existant pour le développement local...
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
```