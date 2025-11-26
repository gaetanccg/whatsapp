#!/bin/bash

# Development Environment Startup Script

set -e

echo "🚀 Starting development environment..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found, copying from .env.example..."
    cp .env.example .env
    echo "✅ Please update .env with your configuration"
fi

# Start development containers
echo "📦 Starting Docker containers in development mode..."
docker-compose -f docker-compose.dev.yml up -d

echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "✅ Development environment is running!"
echo ""
echo "🌐 Services:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend:  http://localhost:5000"
echo "  - API:      http://localhost:5000/api"
echo ""
echo "📝 To view logs:"
echo "  docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo "🛑 To stop:"
echo "  docker-compose -f docker-compose.dev.yml down"
