#!/bin/bash

# Graphiti Tracker Setup Script

set -e

echo "Setting up Graphiti Tracker for UI-TARS Desktop..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Graphiti Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
GRAPHITI_SERVICE_PORT=8100

# Ollama Configuration (FREE local models)
# No API key needed! Models run locally on your machine
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_LLM_MODEL=gemma3n:e2b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
EOF
    echo ".env file created with FREE Ollama configuration (no API keys needed!)."
fi

# Install Python dependencies for local development
echo "Installing Python dependencies..."
cd src/python
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Start services
echo "Starting Graphiti services..."
cd ../..
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 15

# Initialize Ollama models
echo ""
echo "Initializing Ollama models..."
./init-ollama.sh

# Check service health
echo ""
echo "Checking service health..."
curl -f http://localhost:8100/health || echo "Graphiti service not yet ready. Please check logs with 'docker-compose logs graphiti-service'"

echo ""
echo "Setup complete!"
echo ""
echo "Graphiti services are running:"
echo "  - Neo4j: http://localhost:7474 (user: neo4j, password: password123)"
echo "  - Graphiti API: http://localhost:8100"
echo "  - Ollama: http://localhost:11434"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop services: docker-compose down"
echo ""
echo "Next steps:"
echo "1. Enable Graphiti tracking in UI-TARS settings"
echo "2. No API keys needed - everything runs locally for FREE!"
echo ""
echo "Models installed:"
echo "  - LLM: Gemma 3n e2b (powerful free model)"
echo "  - Embeddings: nomic-embed-text"