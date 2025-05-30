/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: false, // Désactiver pour éviter les problèmes d'API
  images: {
    domains: ['*'],
    unoptimized: process.env.NODE_ENV === 'production', // Désactiver l'optimisation en production pour éviter les erreurs
  },
  output: 'standalone', // Pour de meilleures performances sur Vercel
  experimental: {
    outputFileTracingRoot: process.cwd(), // Aide à résoudre certains problèmes de build
  },
  typescript: {
    ignoreBuildErrors: true, // Ignorer les erreurs TS pendant le build
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignorer les erreurs ESLint pendant le build
  },
  webpack: (config) => {
    // Éviter les problèmes avec fs/path dans le navigateur
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

module.exports = nextConfig;
