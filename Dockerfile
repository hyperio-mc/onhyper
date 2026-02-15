# OnHyper.io - Single Server Railway Deployment
# Builds SvelteKit frontend as static files, served by Hono backend
# Everything runs on a single port

# ----------------------------------------------------------------
# Stage 1: Build the frontend (SvelteKit with adapter-static)
# ----------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies (including adapter-static)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend as static files (outputs to build/)
RUN npm run build

# ----------------------------------------------------------------
# Stage 2: Build the backend
# ----------------------------------------------------------------
FROM node:20-bookworm-slim AS backend-builder

# Install build dependencies for native modules (better-sqlite3, lmdb)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy backend package files
COPY package*.json ./

# Install backend dependencies
RUN npm ci --include=dev

# Copy backend source
COPY tsconfig.json ./
COPY src ./src

# Build backend TypeScript
RUN npm run build

# ----------------------------------------------------------------
# Stage 3: Production image - Single server
# ----------------------------------------------------------------
FROM node:20-bookworm-slim AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Backend Setup ----
# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./

# Copy backend source for lmdb etc (some native modules need it)
COPY --from=backend-builder /app/backend/src ./src

# ---- Frontend Setup ----
# Copy built frontend static files (for Hono to serve)
COPY --from=frontend-builder /app/frontend/build ./frontend-build

# Create data directory for backend
RUN mkdir -p /app/data

# Expose single port
EXPOSE 3000

# Set production defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV SQLITE_PATH=/app/data/onhyper.db
ENV LMDB_PATH=/app/data/onhyper.lmdb

# Health check (single backend server)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the single server (Hono serves both API and frontend)
CMD ["node", "dist/index.js"]