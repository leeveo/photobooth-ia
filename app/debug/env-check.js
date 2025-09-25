// Script pour vérifier les variables d'environnement en production
console.log("🔧 DIAGNOSTIC VARIABLES D'ENVIRONNEMENT");
console.log("=======================================");
console.log("");

console.log("📍 Environnement:", process.env.NODE_ENV);
console.log("📍 URL actuelle:", typeof window !== 'undefined' ? window.location.href : 'N/A');

console.log("");
console.log("🌐 Variables Site URL:");
console.log("  NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL || "❌ MANQUANTE");
console.log("  NEXTAUTH_URL:", process.env.NEXTAUTH_URL || "❌ MANQUANTE");

console.log("");
console.log("🔐 Variables Supabase:");
console.log("  NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL || "❌ MANQUANTE");
console.log("  NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ CONFIGURÉE" : "❌ MANQUANTE");

console.log("");
console.log("🔐 Variables Google OAuth:");
console.log("  NEXT_PUBLIC_GOOGLE_CLIENT_ID:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "✅ CONFIGURÉE" : "❌ MANQUANTE");
console.log("  GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✅ CONFIGURÉE" : "❌ MANQUANTE");
console.log("  NEXT_PUBLIC_OAUTH_REDIRECT_BASE:", process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE || "❌ MANQUANTE");

console.log("");
if (process.env.NODE_ENV === 'production') {
  const missingVars = [];
  
  if (!process.env.NEXT_PUBLIC_SITE_URL) missingVars.push('NEXT_PUBLIC_SITE_URL');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (missingVars.length > 0) {
    console.log("🚨 VARIABLES MANQUANTES EN PRODUCTION:");
    missingVars.forEach(varName => {
      console.log(`  - ${varName}`);
    });
    console.log("");
    console.log("➡️ Ajoutez ces variables dans Vercel Dashboard:");
    console.log("https://vercel.com/dashboard > Projet > Settings > Environment Variables");
  } else {
    console.log("✅ Toutes les variables nécessaires sont configurées");
  }
}

export default function EnvDiagnostic() {
  // Ce composant ne fait que du logging côté client
  return null;
}