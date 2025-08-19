/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
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
    unoptimized: process.env.NODE_ENV === 'development' // Optimize in production, skip in development
  },
  experimental: {
    outputFileTracingRoot: process.cwd(),
    largePageDataBytes: 256 * 1000, // 256KB (increased)
    serverComponentsExternalPackages: ['sharp', 'aws-sdk', '@aws-sdk/client-s3'],
    serverActions: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Ignorer les erreurs TS pendant le build
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignorer les erreurs ESLint pendant le build
  },
  productionBrowserSourceMaps: true, // Add better source maps for production
  transpilePackages: ['react-konva', '@dnd-kit', 'konva'], // Increase stability for problematic modules
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
  },
  
  // Configuration pour réduire la taille des bundles sur Vercel
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
};

module.exports = nextConfig;
