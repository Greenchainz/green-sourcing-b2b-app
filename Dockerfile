# GreenChainz Frontend - Next.js Container
# Build: docker build -t greenchainz-frontend:latest .
# Run: docker run -p 3000:3000 greenchainz-frontend:latest

FROM node:20-alpine AS base

# ─────────────────────────────────────────────────────────────
# Stage 1: Install dependencies
# ─────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────
# Stage 2: Build the Next.js application
# ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public config (inlined into client bundles)
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_AZURE_TENANT
ARG NEXT_PUBLIC_AZURE_CLIENT_ID
ARG NEXT_PUBLIC_AZURE_REDIRECT_URI
ARG NEXT_PUBLIC_INTERCOM_APP_ID

ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_AZURE_TENANT=${NEXT_PUBLIC_AZURE_TENANT}
ENV NEXT_PUBLIC_AZURE_CLIENT_ID=${NEXT_PUBLIC_AZURE_CLIENT_ID}
ENV NEXT_PUBLIC_AZURE_REDIRECT_URI=${NEXT_PUBLIC_AZURE_REDIRECT_URI}
ENV NEXT_PUBLIC_INTERCOM_APP_ID=${NEXT_PUBLIC_INTERCOM_APP_ID}

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js in standalone mode
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 3: Production runner
# ─────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for Azure Container Apps
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Run Next.js in standalone mode
CMD ["node", "server.js"]
