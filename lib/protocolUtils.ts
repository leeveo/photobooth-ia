// Middleware pour rediriger HTTP vers HTTPS automatiquement
export function redirectToHttps(url: string): string {
  if (url.startsWith('http://localhost:3000')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

// Fonction pour détecter le protocole du serveur
export function getServerProtocol(): 'http' | 'https' {
  if (typeof window !== 'undefined') {
    // Côté client : détecter si le serveur utilise HTTPS
    return window.location.protocol === 'https:' ? 'https' : 'http';
  }
  
  // Côté serveur : par défaut HTTPS en production, HTTP en dev
  return process.env.NODE_ENV === 'production' ? 'https' : 'http';
}

// Fonction pour construire l'URL de callback correcte
export function getCallbackUrl(): string {
  const protocol = typeof window !== 'undefined' ? window.location.protocol.slice(0, -1) : 'http';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  
  if (host === 'localhost:3000') {
    // Forcer HTTP pour localhost jusqu'à ce que Google Cloud Console soit mis à jour
    return 'http://localhost:3000/photobooth-ia/admin/auth/callback';
  }
  
  return `https://${host}/photobooth-ia/admin/auth/callback`;
}