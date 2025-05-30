/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: false, // Désactiver pour éviter les problèmes d'API
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
      'localhost'
    ],
    unoptimized: process.env.NODE_ENV === 'development' // Optimize in production, skip in development
  },
  output: 'standalone', // Pour de meilleures performances sur Vercel
  experimental: {
    outputFileTracingRoot: process.cwd(), // Aide à résoudre certains problèmes de build
    largePageDataBytes: 128 * 1000, // 128KB
    outputFileTracingIncludes: {
      '**': ['node_modules/**/*.js'],
    },
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
    // Éviter les problèmes avec fs/path dans le navigateur
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    
    // Add a plugin to catch undefined variable errors
    if (!dev && !isServer) {
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions.compress.warnings = false;
          minimizer.options.terserOptions.compress.drop_console = false;
          minimizer.options.terserOptions.compress.keep_fnames = true;
          minimizer.options.terserOptions.compress.pure_funcs = [];
        }
      });
    }
    
    // Avoid lambda function serialization issues
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    
    return config;
  },
};

module.exports = nextConfig;
