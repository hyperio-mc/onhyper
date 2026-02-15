#!/bin/bash
set -e

# OnHyper.io Production Startup Script
# Two-server mode: Frontend (3000) + Backend (3001)
# Frontend proxies API calls to backend

echo "Starting OnHyper.io two-server architecture..."

# Create data directory if needed
mkdir -p /app/data

# Start backend on port 3001
echo "Starting backend server on port 3001..."
cd /app/backend
PORT=3001 HOST=0.0.0.0 node dist/index.js &
BACKEND_PID=$!

# Wait for backend health check to pass
echo "Waiting for backend to be healthy..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "Backend is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Backend failed to start within 15 seconds"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 0.5
done

# Start frontend on port 3000 (proxies to backend on 3001)
echo "Starting frontend server on port 3000..."
cd /app/frontend
BACKEND_URL=http://localhost:3001 PORT=3000 HOST=0.0.0.0 node build

# Clean up backend when frontend exits
kill $BACKEND_PID 2>/dev/null || true