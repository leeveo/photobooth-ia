const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Désactiver complètement la génération statique et utiliser uniquement le mode serveur
  output: 'server',
  
  // Désactiver les optimisations qui causent des problèmes
  swcMinify: true,
  
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
      // Alias "canvas" à notre module dummyCanvas.js
      config.resolve.alias['canvas'] = path.resolve(__dirname, 'dummyCanvas.js');
      // Désactiver la résolution de FS et Path côté client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig
