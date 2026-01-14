# ==============================================================================
# SirTrav A2A Studio - Production Dockerfile
# Target: Google Cloud Run (Node.js 18)
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: BUILDER
# ------------------------------------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install ALL dependencies (including devDeps if building TS/Vite)
# We use 'ci' for deterministic installs
RUN npm ci

# Copy source code
COPY . .

# Build the frontend (Vite) and backend (Netlify Functions -> standalone if needed)
# NOTE: For this "Agent Start Pack", we are primarily running the manifest runner backend.
# If we need the UI served, we can build it here. 
# For now, we ensure the pipeline scripts are ready.
RUN npm run build

# ------------------------------------------------------------------------------
# STAGE 2: RUNTIME
# ------------------------------------------------------------------------------
FROM node:18-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy necessary files from builder
# We need the pipelines directory, manifest, and any built assets
COPY --from=builder /app/pipelines ./pipelines
COPY --from=builder /app/netlify ./netlify
COPY --from=builder /app/dist ./dist
# Copy docs/config if needed for runtime
COPY --from=builder /app/package.json ./

# Create temp directory for pipeline outputs
RUN mkdir -p /tmp/sirtrav && chown -R node:node /tmp/sirtrav

# Switch to non-root user for security
USER node

# Expose port (Cloud Run defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# START COMMAND
# Runs the new 'start:prod' script we will add to package.json
# Or directly runs the manifest runner as a service (future state)
# For now, we will expose a simple HTTP server to trigger the pipeline, 
# or use the CLI entry point if this is a job.
# Assuming this is a Service that listens for HTTP triggers:
CMD ["npm", "run", "start:prod"]
