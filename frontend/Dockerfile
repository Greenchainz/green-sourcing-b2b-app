# FILE: frontend/Dockerfile
# PURPOSE: Builds the React + Vite Frontend (Corrected)

# -----------------
# STAGE 1: The Builder
# -----------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files from the frontend folder
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend source code
COPY frontend/. .

# Build the production app
RUN npm run build

# -----------------
# STAGE 2: The Production Runner
# -----------------
FROM node:18-alpine AS runner

WORKDIR /app

# Copy only the built assets and package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Install 'serve' to run the static build
RUN npm install -g serve

EXPOSE 5173

# Run the app
CMD ["serve", "-s", "dist", "-l", "5173"]