#!/bin/bash
set -e

# OnHyper.io Production Startup Script
# Runs frontend (SvelteKit on port 3000) and backend (Hono on port 3001)

echo "Starting OnHyper.io servers..."

# Create data directory if needed
mkdir -p /app/data

# Start the backend server (Hono on port 3001)
echo "Starting backend server on port 3001..."
cd /app/backend
PORT=3001 HOST=0.0.0.0 node dist/index.js &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    sleep 0.5
done

# Start the frontend server (SvelteKit adapter-node on port 3000)
echo "Starting frontend server on port 3000..."
cd /app/frontend
BACKEND_URL=http://localhost:3001 PORT=3000 HOST=0.0.0.0 node build

# If frontend exits, kill backend too
kill $BACKEND_PID 2>/dev/null || true