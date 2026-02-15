# OnHyper.io - Two-Server Railway Deployment
# SvelteKit frontend (adapter-node) + Hono backend
# Frontend runs on port 3000, proxies to backend on port 3001
# v2: Rebuild

# ----------------------------------------------------------------
# Stage 1: Build the frontend (SvelteKit with adapter-node)
# ----------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies (including adapter-node)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend as Node.js server (outputs to build/)
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
# Stage 3: Production image - Two servers
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
# Create backend directory and copy its files
RUN mkdir -p /app/backend
COPY --from=backend-builder /app/backend/dist /app/backend/dist
COPY --from=backend-builder /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/backend/package.json /app/backend/

# ---- Frontend Setup ----
# Create frontend directory and copy its files
RUN mkdir -p /app/frontend
COPY --from=frontend-builder /app/frontend/build /app/frontend/build
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/

# Create data directory for backend
RUN mkdir -p /app/data

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port 3000 (frontend)
EXPOSE 3000

# Set production defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV SQLITE_PATH=/app/data/onhyper.db
ENV LMDB_PATH=/app/data/onhyper.lmdb

# Health check on frontend which proxies to backend
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start both servers via startup script
CMD ["/app/start.sh"]