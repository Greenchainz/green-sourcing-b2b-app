# Multi-stage build for Next.js on Azure

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install pnpm and dependencies (lockfileVersion 9 requires pnpm v10)
RUN npm install -g pnpm@10.28.2 && \
    pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm for build commands
RUN npm install -g pnpm@10.28.2

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY . .

# Accept build-time environment variables for Next.js
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

# Build Next.js app
RUN pnpm run build

# Stage 3: Runtime (Azure App Service optimized)
FROM node:20-alpine AS runtime
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Set environment variables
ENV NODE_ENV=production \
    NODE_PG_FORCE_NATIVE="" \
    PORT=3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start Next.js server
CMD ["node", "server.js"]
