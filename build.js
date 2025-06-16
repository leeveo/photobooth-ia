// Script de build personnalisé pour Vercel
const { execSync } = require('child_process');

console.log("🚀 Démarrage du build pour Vercel...");

// Définir une variable d'environnement pour désactiver la génération statique
process.env.NEXT_SKIP_GENERATE_STATIC = 'true';

try {
  // Exécuter la commande de build Next.js standard
  console.log("Exécution de 'next build'...");
  execSync('next build', { stdio: 'inherit' });
  console.log("✅ Build terminé avec succès!");
} catch (error) {
  console.error("❌ Erreur lors du build:", error);
  process.exit(1);
}
