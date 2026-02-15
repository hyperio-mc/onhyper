# OnHyper.io - Railway Deployment
# Builds both Backend (Hono) and Frontend (SvelteKit)
# Frontend runs on port 3000, Backend on port 3001

# ------------------------------------------------ ----------
# Stage 1: Build the backend
# ------------------------------------------------ ----------
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

# ------------------------------------------------ ----------
# Stage 2: Build the frontend
# ------------------------------------------------ ----------
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend (SvelteKit with adapter-node)
RUN npm run build

# ------------------------------------------------ ----------
# Stage 3: Production image
# ------------------------------------------------ ----------
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
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/

# Copy backend source for lmdb etc (some native modules need it)
COPY --from=backend-builder /app/backend/src ./backend/src

# ---- Frontend Setup ----
# Copy built frontend (adapter-node outputs to build/)
COPY --from=frontend-builder /app/frontend/build ./frontend/build
COPY --from=frontend-builder /app/frontend/package.json ./frontend/
# Copy node_modules for frontend (needed for adapter-node runtime)
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules

# Create data directory for backend
RUN mkdir -p /app/data

# Copy startup script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Expose ports (3000 = frontend, 3001 = backend)
EXPOSE 3000 3001

# Set production defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV BACKEND_PORT=3001
ENV SQLITE_PATH=/app/data/onhyper.db
ENV LMDB_PATH=/app/data/onhyper.lmdb

# Health check (frontend proxies to backend)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start both servers
CMD ["./start.sh"]