# -----------------
# Stage 1: Builder
# -----------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy ALL backend source code (including subdirectories)
COPY . .

# Copy database schemas
COPY database-schemas ./database-schemas

# -----------------
# Stage 2: Runner
# -----------------
FROM node:18-alpine AS runner

WORKDIR /app

# Copy everything from builder stage
COPY --from=builder /app ./

# Expose port
EXPOSE 3001

# Start the app
CMD ["node", "index.js"]
