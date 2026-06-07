# Multi-stage build for GreenChainz B2B app on Azure
# Stack: Vite (client) + Express (server) — output goes to dist/
# Base image: dhi.io/node:22-debian13 (Docker Hardened Image — zero-CVE runtime)
# Stage 1: Dependencies
FROM dhi.io/node:22-debian13-dev AS deps
WORKDIR /app
# Enable corepack (built into Node 22) to install pnpm without hitting npm registry
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
# Install dumb-init for proper signal handling (copied to runtime below)
# Upgrade all packages first to pull in glibc security patches from Debian repos
RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*
# Copy package files and patches (needed for pnpm patched dependencies)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Stage 2: Builder
FROM dhi.io/node:22-debian13-dev AS builder
WORKDIR /app
# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy application files
COPY . .
# Accept build-time environment variables
# WebPubSub — public endpoint, safe to hardcode as defaults
ARG VITE_FRONTEND_WEBPUBSUB_ENDPOINT=https://greenchainz.webpubsub.azure.com
ARG VITE_FRONTEND_WEBPUBSUB_HUB=greenchainzhub
# Azure Maps key — ARG only (not ENV) so the value is never written to a persistent layer.
# Vite reads it during the build step below via the inline env var.
ARG VITE_AZURE_MAPS_KEY
ARG VITE_BACKEND_URL
# Make them available during build
ENV VITE_FRONTEND_WEBPUBSUB_ENDPOINT=$VITE_FRONTEND_WEBPUBSUB_ENDPOINT \
    VITE_FRONTEND_WEBPUBSUB_HUB=$VITE_FRONTEND_WEBPUBSUB_HUB \
    VITE_BACKEND_URL=$VITE_BACKEND_URL \
    NODE_ENV=production
# NOTE: This app uses Drizzle ORM, not Prisma. No codegen step needed.
# Build the app:
#   - vite build  → dist/public/ (client static assets, VITE_AZURE_MAPS_KEY baked in here)
#   - esbuild     → dist/index.js (server bundle)
RUN VITE_AZURE_MAPS_KEY=$VITE_AZURE_MAPS_KEY pnpm run build

# Stage 3: Runtime — node:22-bookworm-slim (Debian 12, actively patched glibc, non-root node user)
FROM node:22.22.3-trixie-slim AS runtime
WORKDIR /app
# Patch all OS packages (including glibc) at image build time
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*
# Copy dumb-init binary from deps stage
COPY --from=deps /usr/bin/dumb-init /usr/bin/dumb-init
# node:22-bookworm-slim includes non-root user 'node' (uid 1000)
# Copy the production build output
# dist/index.js  = Express server bundle (esbuild --packages=external output)
# dist/public/   = Vite client build (static assets served by Express)
COPY --from=builder --chown=node:node /app/dist ./dist
# node_modules REQUIRED: esbuild uses --packages=external so deps are NOT bundled
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
# Copy public folder (icons, manifests, email templates, etc.)
COPY --from=builder --chown=node:node /app/public ./public
# Copy package.json for module resolution
COPY --from=builder --chown=node:node /app/package.json ./package.json
# Switch to non-root user (already the default in DHI runtime)
USER node
# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_PG_FORCE_NATIVE=""
# Health check — exec form required (no shell in DHI minimal runtime)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["node", "-e", "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"]
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
# Start the Express server (dist/index.js is the esbuild output of server/_core/index.ts)
CMD ["node", "dist/index.js"]
