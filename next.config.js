/** @type {import('next').NextConfig} */
const nextConfig = {
  // Désactiver complètement la génération statique et utiliser uniquement le mode serveur
  output: 'server',
  
  // Désactiver les optimisations qui causent des problèmes
  swcMinify: false,
  
  // Configuration des images 
  images: {
    domains: ['localhost', 'storage.googleapis.com', 'lh3.googleusercontent.com', 'pbs.twimg.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Ignorer les erreurs de vérification
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Paramètres expérimentaux pour résoudre les problèmes de sérialisation
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  
  // Personnalisation de webpack pour gérer canvas
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ne pas résoudre le module 'fs' côté client pour éviter cette erreur
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig
