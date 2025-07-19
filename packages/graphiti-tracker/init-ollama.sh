#!/bin/bash

# Initialize Ollama with required models

echo "Initializing Ollama models for Graphiti..."

# Wait for Ollama to be ready
echo "Waiting for Ollama service..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
    echo "Ollama not ready yet, waiting..."
    sleep 5
done

echo "Ollama is ready!"

# Pull the required models
echo "Pulling Gemma 3n e2b model..."
docker exec ui-tars-ollama ollama pull gemma3n:e2b

echo "Pulling nomic-embed-text embedding model..."
docker exec ui-tars-ollama ollama pull nomic-embed-text

# List available models
echo ""
echo "Available models:"
docker exec ui-tars-ollama ollama list

echo ""
echo "Ollama initialization complete!"
echo "Models are ready for use with Graphiti."