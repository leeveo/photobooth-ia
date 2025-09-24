/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  // Désactiver la génération statique pour éviter les erreurs de sérialisation
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placeholder.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      }
    ],
    domains: [
      'gyohqmahwntkmebayeej.supabase.co',
      'leeveostockage.s3.eu-west-3.amazonaws.com',
      'leeveostockage.s3.amazonaws.com',
      's3.eu-west-3.amazonaws.com',
      'placeholder.com',
      'localhost',
      'replicate.delivery',
      'replicate.com'
    ],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  experimental: {
    outputFileTracingRoot: process.cwd(),
    largePageDataBytes: 256 * 1000,
    serverComponentsExternalPackages: ['sharp', 'aws-sdk', '@aws-sdk/client-s3'],
    serverActions: true,
    // Désactiver la génération de pages statiques pour éviter les erreurs de sérialisation
    staticPageGenerationTimeout: 0,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: false, // Désactiver pour réduire la taille
  transpilePackages: ['react-konva', '@dnd-kit', 'konva'],
  webpack: (config, { dev, isServer }) => {
    // Configuration pour la production sur Vercel
    if (!dev && isServer) {
      // Optimisations pour réduire la taille des bundles
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };

      // Externaliser les modules lourds
      config.externals = [
        ...config.externals,
        'sharp',
        'canvas',
        'jsdom',
        'aws-sdk',
        '@aws-sdk/client-s3',
        'ffmpeg-static',
        'fluent-ffmpeg',
        'lodash'
      ];
    }
    
    // Éviter les problèmes avec fs/path dans le navigateur
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      canvas: false,
      'canvas-prebuilt': false,
      gifencoder: false
    };
    
    // Optimisations pour la production
    if (!dev && !isServer) {
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions.compress = {
            ...minimizer.options.terserOptions.compress,
            warnings: false,
            drop_console: true, // Supprimer les console.log en production
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          };
        }
      });
    }
    
    return config;
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/photobooth-ia/admin/',
        permanent: true,
      },
    ]
  },
  // Handle environment variables
  env: {
    NEXT_PUBLIC_GIF_GENERATION_ENABLED: process.env.NODE_ENV !== 'production',
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
    GEMINI: process.env.GEMINI,
  },
  
  // Configuration pour réduire la taille des bundles sur Vercel
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
};

module.exports = nextConfig;
