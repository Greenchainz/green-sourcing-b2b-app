# -----------------
# Stage 1: Builder
# -----------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (from backend/ context)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy ALL backend source code (build context is backend/)
COPY . .

# -----------------
# Stage 2: Runner
# -----------------
FROM node:20-alpine AS runner

WORKDIR /app

# Copy everything from builder stage
COPY --from=builder /app ./

# Expose port
EXPOSE 3001

# Start the app
CMD ["node", "index.js"]
