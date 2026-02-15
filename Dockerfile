# OnHyper.io - Single-Server Railway Deployment
# Plain Vite + Svelte frontend served by Hono backend
# Everything runs on one port (3000)

# ----------------------------------------------------------------
# Stage 1: Build the frontend (Vite -> static files)
# ----------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend (outputs to dist/)
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

# Copy backend dist and node_modules
COPY --from=backend-builder /app/backend/dist ./backend-dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./

# Copy frontend static files (served by Hono)
COPY --from=frontend-builder /app/frontend/dist ./static

# Create data directory
RUN mkdir -p /app/data

# Expose single port
EXPOSE 3000

# Set production defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV SQLITE_PATH=/app/data/onhyper.db
ENV LMDB_PATH=/app/data/onhyper.lmdb
ENV STATIC_PATH=/app/static

# Health check on the single server
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the single Hono server
CMD ["node", "backend-dist/index.js"]# Build v1771157869
