/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
  // Forcer le runtime Node.js pour les middlewares
  experimental: {
    serverComponentsExternalPackages: ['jsonwebtoken'],
  },
  // Configuration pour permettre l'utilisation de modules Node.js dans les middlewares
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'jsonwebtoken': 'commonjs jsonwebtoken',
      });
    }
    return config;
  },
}

module.exports = nextConfig
