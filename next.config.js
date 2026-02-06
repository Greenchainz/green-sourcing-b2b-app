/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone',  // Disabled - using regular production build
  typescript: {
    ignoreBuildErrors: true,
          {
            key: 'Content-Security-Policy',
            // Note: 'unsafe-inline' and 'unsafe-eval' are used here.
            // For higher security, consider using nonces or hashes.
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://cdn-cookieyes.com https://widget.intercom.io https://js.intercomcdn.com; script-src-elem 'self' https://static.cloudflareinsights.com https://cdn-cookieyes.com https://widget.intercom.io https://js.intercomcdn.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://static.zohocdn.com https://r2cdn.perplexity.ai; img-src 'self' data: https:; connect-src 'self' http://localhost:* https:; frame-src 'self' https://widget.intercom.io https://js.intercomcdn.com"
          }
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://cdn-cookieyes.com https://widget.intercom.io https://js.intercomcdn.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://static.zohocdn.com https://r2cdn.perplexity.ai; img-src 'self' data: https:; connect-src 'self' http://localhost:* https:; frame-src 'self'"
          }
        ]
      }
    ]
  },
  webpack: (config) => {
    // Externalize pg-native to prevent Edge runtime errors
    config.externals.push({
      'pg-native': 'commonjs pg-native',
    });
    return config;
  },
}

module.exports = nextConfig


// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "greenchainz-v1",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
