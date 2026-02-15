#!/bin/bash
set -e

# OnHyper.io Production Startup Script
# Single server mode - Hono backend serves static frontend files

echo "Starting OnHyper.io single server..."

# Create data directory if needed
mkdir -p /app/data

# Start the backend server (serves frontend + API on single port)
echo "Starting server on port ${PORT:-3000}..."
cd /app
exec node dist/index.js