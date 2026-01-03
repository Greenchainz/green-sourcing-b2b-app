/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Use app directory only, disable pages router
  experimental: {
    appDir: true,
  },
  // Fix watchpack errors on Windows
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        aggregateTimeout: 300,
        poll: 1000,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
