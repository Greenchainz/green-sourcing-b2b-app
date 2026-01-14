/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Warning: Ignoring ESLint errors during build is not recommended for production.
    // TODO: Disable this once all linting issues are resolved.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: Ignoring TypeScript errors during build is not recommended for production.
    // TODO: Disable this once all type issues are resolved.
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          },
          {
            key: 'Content-Security-Policy',
            // Note: 'unsafe-inline' and 'unsafe-eval' are used here.
            // For higher security, consider using nonces or hashes.
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://static.zohocdn.com https://r2cdn.perplexity.ai; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https:; frame-src https://js.stripe.com https://m.stripe.network https://hooks.stripe.com"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
