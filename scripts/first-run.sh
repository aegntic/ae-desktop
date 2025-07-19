#!/bin/bash

# ae-desktop First Run Setup Script
# This script ensures all services are properly configured on first run

echo "========================================"
echo "    ae-desktop First Run Setup"
echo "========================================"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Some features will be limited."
    echo "   Install Docker from: https://docs.docker.com/get-docker/"
else
    echo "✅ Docker found"
fi

# Check for Ollama
if ! command -v ollama &> /dev/null; then
    echo "📦 Installing Ollama..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ollama
        else
            echo "Please install Ollama from: https://ollama.ai/download"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "Please install Ollama from: https://ollama.ai/download"
    fi
else
    echo "✅ Ollama found"
fi

# Start Ollama service
echo "🚀 Starting Ollama service..."
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    ollama serve > /dev/null 2>&1 &
    sleep 5
fi

# Pull required models
echo "📥 Downloading AI models (this may take a few minutes)..."
ollama pull gemma3n:e2b || echo "Failed to pull gemma3n:e2b, will retry on app start"
ollama pull nomic-embed-text || echo "Failed to pull embedding model"

# Create necessary directories
mkdir -p ~/.ae-desktop/{logs,data,cache}

# SuperClaude check
if [ -d "$HOME/.claude" ]; then
    echo "✅ SuperClaude framework detected"
else
    echo "ℹ️  SuperClaude not installed (optional)"
fi

echo ""
echo "========================================"
echo "✨ ae-desktop is ready to launch!"
echo "========================================"
echo ""
echo "Run 'pnpm dev' to start the application"
echo ""