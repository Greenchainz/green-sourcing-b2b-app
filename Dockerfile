# Multi-stage build for GreenChainz B2B app on Azure

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Enable corepack (built into Node 20) to install pnpm without hitting npm registry
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Copy package files
COPY package*.json pnpm-lock.yaml* ./
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

# Make them available during build
ENV NEXT_PUBLIC_AZURE_CLIENT_ID=$NEXT_PUBLIC_AZURE_CLIENT_ID \
    NEXT_PUBLIC_AZURE_TENANT_ID=$NEXT_PUBLIC_AZURE_TENANT_ID \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_INTERCOM_APP_ID=$NEXT_PUBLIC_INTERCOM_APP_ID \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NODE_ENV=production

# Generate Prisma client
RUN npx prisma generate 2>/dev/null || echo 'Prisma generate skipped'

# Build the app
RUN pnpm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy full production build
COPY --from=builder --chown=nextjs:nodejs /app/.next /app/.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public /app/public
COPY --from=builder --chown=nextjs:nodejs /app/package*.json /app/

# Switch to non-root user
USER nextjs

# Set environment variables
ENV NODE_ENV=production \
    NODE_PG_FORCE_NATIVE=""

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000 3001

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npx", "next", "start"]
