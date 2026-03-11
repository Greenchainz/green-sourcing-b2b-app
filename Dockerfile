# Multi-stage build for GreenChainz B2B app on Azure
# Stack: Vite (client) + Express (server) — output goes to dist/
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Enable corepack (built into Node 20) to install pnpm without hitting npm registry
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
# Copy package files and patches (needed for pnpm patched dependencies)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy application files
COPY . .
# Accept build-time environment variables
ARG NEXT_PUBLIC_AZURE_CLIENT_ID
ARG NEXT_PUBLIC_AZURE_TENANT_ID
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_INTERCOM_APP_ID
ARG NEXT_PUBLIC_SITE_URL
# WebPubSub — public endpoint, safe to hardcode as defaults
ARG VITE_FRONTEND_WEBPUBSUB_ENDPOINT=https://greenchainz.webpubsub.azure.com
ARG VITE_FRONTEND_WEBPUBSUB_HUB=greenchainzhub
# Make them available during build
ENV NEXT_PUBLIC_AZURE_CLIENT_ID=$NEXT_PUBLIC_AZURE_CLIENT_ID \
    NEXT_PUBLIC_AZURE_TENANT_ID=$NEXT_PUBLIC_AZURE_TENANT_ID \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_INTERCOM_APP_ID=$NEXT_PUBLIC_INTERCOM_APP_ID \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    VITE_FRONTEND_WEBPUBSUB_ENDPOINT=$VITE_FRONTEND_WEBPUBSUB_ENDPOINT \
    VITE_FRONTEND_WEBPUBSUB_HUB=$VITE_FRONTEND_WEBPUBSUB_HUB \
    NODE_ENV=production
# Generate Prisma client
RUN npx prisma generate 2>/dev/null || echo 'Prisma generate skipped'
# Build the app:
#   - vite build  → dist/public/ (client static assets)
#   - esbuild     → dist/index.js (server bundle)
RUN pnpm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init
# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001
# Copy the production build output
# dist/index.js  = Express server bundle (esbuild --packages=external output)
# dist/public/   = Vite client build (static assets served by Express)
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
# node_modules REQUIRED: esbuild uses --packages=external so deps are NOT bundled
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
# Copy public folder (icons, manifests, email templates, etc.)
COPY --from=builder --chown=appuser:nodejs /app/public ./public
# Copy package.json for module resolution
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
# Switch to non-root user
USER appuser
# Set environment variables
ENV NODE_ENV=production \
    NODE_PG_FORCE_NATIVE=""
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
# Start the Express server (dist/index.js is the esbuild output of server/_core/index.ts)
CMD ["node", "dist/index.js"]
