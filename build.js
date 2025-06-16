// Script de build personnalisé pour contourner les problèmes de génération statique
const { execSync } = require('child_process');

console.log("🚀 Démarrage du build personnalisé...");

// Désactiver la prérendu statique
process.env.NEXT_SKIP_STATIC_GENERATION = 'true';

try {
  // Exécuter la commande de build avec des options spécifiques
  execSync('next build --no-lint', { stdio: 'inherit' });
  console.log("✅ Build terminé avec succès!");
} catch (error) {
  console.error("❌ Erreur lors du build:", error);
  process.exit(1);
}
