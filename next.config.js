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
  output: 'standalone', // Pour de meilleures performances sur Vercel
  experimental: {
    outputFileTracingRoot: process.cwd(), // Aide à résoudre certains problèmes de build
    largePageDataBytes: 128 * 1000, // 128KB
    outputFileTracingIncludes: {
      '**': ['node_modules/**/*.js'],
    },
    externalDir: true, // Ajouter cette option pour les images externes
    serverComponentsExternalPackages: [],
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
    
    // Add support for WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    // Handle native modules that cause issues in Vercel
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        'canvas-prebuilt': false,
        gifencoder: false
      };
    }
    
    // Skip certain modules in server-side builds in production
    if (isServer && process.env.NODE_ENV === 'production') {
      // Exclude canvas and gifencoder from server bundle
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        
        // These modules should be treated as empty modules on Vercel
        if (entries['pages/api/gif-generator'] || entries['app/api/gif-generator']) {
          const moduleMap = {
            canvas: false,
            gifencoder: false
          };
          
          Object.keys(moduleMap).forEach(mod => {
            config.externals.push((context, request, callback) => {
              if (request === mod) {
                // Skip this module in production
                return callback(null, 'commonjs ' + request);
              }
              callback();
            });
          });
        }
        
        return entries;
      };
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
  }
};

module.exports = nextConfig;
