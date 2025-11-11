# FILE: backend/Dockerfile
# PURPOSE: Builds the Node.js/Express API (Corrected)

# -----------------
# STAGE 1: The Builder
# -----------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files from the backend folder
COPY backend/package*.json ./
RUN npm install

# Copy the rest of the backend source code
COPY backend/. .

# Copy the schema folder from the root
COPY database-schemas ./database-schemas

# -----------------
# STAGE 2: The Production Runner
# -----------------
FROM node:18-alpine AS runner

WORKDIR /app

# Copy dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy all built application code from builder
# This now includes index.js, db.js, and database-schemas
COPY --from=builder /app .

EXPOSE 3001
CMD ["node", "index.js"]
