/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['google-auth-library'],
  },

  images: {
    domains: [
      'images.unsplash.com',
      'unsplash.com',
      'localhost',
      'ffcuisine.fr',
      'picsum.photos',
      'via.placeholder.com',
      'placehold.co',
      'imgur.com',
      'i.imgur.com',
      'cdn.pixabay.com',
      'images.pexels.com',
      'res.cloudinary.com',
      'images.unsplash.com',
      'i.ibb.co', // ImgBB pour les uploads d'images
      'ibb.co', // ImgBB domaines alternatifs
      'encrypted-tbn0.gstatic.com', // Google Images
      'encrypted-tbn1.gstatic.com', // Google Images
      'encrypted-tbn2.gstatic.com', // Google Images
      'encrypted-tbn3.gstatic.com', // Google Images
      'lh3.googleusercontent.com', // Google User Content
      'googleusercontent.com', // Google User Content
      'poissons-coquillages-crustaces.fr' // Images de produits de la mer
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.google.com',
        pathname: '/images/**',
      }
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: true, // Nécessaire pour l'export statique
  },
  
  // Optimisations pour le build
  // ⚠️ Sur certaines configs, SWC minify peut bloquer indéfiniment sur "Creating an optimized production build..."
  // On désactive donc SWC minify pour fiabiliser les builds (web + mobile).
  swcMinify: false,
  
  // Export statique UNIQUEMENT pour l'app mobile (pas pour le déploiement web)
  // Les appels API pointeront vers https://cvneat.fr/api
  // Conditionné par la variable d'environnement BUILD_MOBILE
  ...(process.env.BUILD_MOBILE === 'true' ? { output: 'export' } : {}),
  
  // Headers et redirects désactivés pour export statique
  // (Ils ne fonctionnent pas avec output: 'export')
  // Les headers sont gérés par le serveur web en production
  
  // Optimisations pour le bundle
  webpack: (config, { dev, isServer }) => {
    // Optimisations pour la production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
  
  // Variables d'environnement publiques
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || '',
  },
  
  // Optimisations pour le developpement
  ...(process.env.NODE_ENV === 'development' && {
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
  }),

  // Headers CORS pour l'app mobile Capacitor
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { 
            key: 'Access-Control-Allow-Origin', 
            value: '*' // Autorise toutes les origines (capacitor://localhost, https://cvneat.fr, etc.)
          },
          { 
            key: 'Access-Control-Allow-Methods', 
            value: 'GET, POST, PUT, DELETE, OPTIONS' 
          },
          { 
            key: 'Access-Control-Allow-Headers', 
            value: 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email' 
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
