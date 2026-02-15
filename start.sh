#!/bin/bash
# OnHyper.io Development Start Script
# Builds frontend then runs single server

set -e

echo "🚀 OnHyper.io Development Server"

# Create data directory if needed
mkdir -p data

# Check if frontend needs build
if [ ! -d "frontend/dist" ] || [ ! -f "frontend/dist/index.html" ]; then
    echo "📦 Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
fi

# Check if backend needs build
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    echo "📦 Building backend..."
    npm run build
fi

echo "🌐 Starting server on port 3000..."
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:3000/api"
echo "   Health: http://localhost:3000/health"

# Run the server
STATIC_PATH=./frontend/dist npm run start