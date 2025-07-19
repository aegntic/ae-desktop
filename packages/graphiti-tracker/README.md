# Graphiti Tracker for UI-AE Desktop

This package integrates [Graphiti](https://github.com/getzep/graphiti), a temporal knowledge graph system, to track all actions performed within the UI-AE Desktop application.

## Features

- **Real-time Action Tracking**: Captures all UI actions (clicks, typing, scrolling, etc.)
- **Temporal Knowledge Graph**: Builds a time-aware graph of user interactions
- **Session Management**: Groups actions into sessions with goals and outcomes
- **Screenshot Capture**: Optional before/after screenshots for each action
- **Query Interface**: Search and analyze past actions and patterns
- **Performance Metrics**: Tracks execution time and success rates

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  UI-AE App    │────▶│ Graphiti Tracker │────▶│  Graphiti   │
│  (Electron)     │     │   (TypeScript)   │     │  Service    │
└─────────────────┘     └──────────────────┘     │  (Python)   │
                                                  └──────┬──────┘
                                                         │
                                                  ┌──────▼──────┐
                                                  │   Neo4j     │
                                                  │  Database   │
                                                  └─────────────┘
```

## Setup

### Prerequisites

- Docker and Docker Compose
- Python 3.10+
- No API keys needed! Uses FREE local models via Ollama

### Installation

1. Run the setup script:
   ```bash
   cd packages/graphiti-tracker
   ./setup.sh
   ```

2. The setup automatically:
   - Starts Neo4j graph database
   - Starts Ollama for local LLM inference
   - Downloads Gemma 3n e2b model (powerful and free)
   - Downloads nomic-embed-text embedding model
   - Starts the Graphiti service

3. No API keys or additional configuration needed!

## Configuration

Enable Graphiti tracking in UI-AE Desktop settings:

1. Open UI-AE Desktop
2. Go to Settings
3. Enable "Graphiti Tracking"
4. Configure the service URL (default: http://localhost:8100)
5. Optionally add an API key for authentication

## Usage

### Automatic Tracking

Once enabled, Graphiti automatically tracks:
- All operator actions (click, type, scroll, etc.)
- Action results (success/failure)
- Execution time
- Screenshots (before/after)
- User sessions and goals

### Querying the Knowledge Graph

```typescript
// Query past actions
const tracker = GraphitiTrackerService.getInstance();
const results = await tracker.query("failed login attempts", 10);
```

### Manual Tracking

```typescript
// Track custom events
await tracker.trackAction(
  'custom_action',
  { parameter: 'value' },
  { name: 'target_element' },
  'User intent or goal'
);
```

## API Endpoints

The Graphiti service exposes these endpoints:

- `POST /actions/track` - Track a UI action
- `POST /actions/result` - Track action result
- `POST /sessions/start` - Start a tracking session
- `POST /sessions/end` - End a tracking session
- `POST /query` - Query the knowledge graph
- `GET /health` - Health check

## Development

### Build the package
```bash
pnpm build
```

### Run tests
```bash
pnpm test
```

### View logs
```bash
docker-compose logs -f
```

### Access Neo4j Browser
Navigate to http://localhost:7474 (user: neo4j, password: password123)

## Privacy & Security

- All data is stored locally in your Neo4j instance
- All AI processing happens locally via Ollama (no external API calls)
- Screenshots are optional and can be disabled
- Sessions can be anonymized by not providing user IDs
- Completely FREE - no API keys or subscriptions required

## Troubleshooting

### Service won't start
- Check Docker is running
- Verify ports 7474, 7687, and 8100 are available
- Check logs: `docker-compose logs graphiti-service`

### Tracking not working
- Ensure Graphiti is enabled in settings
- Verify service is healthy: `curl http://localhost:8100/health`
- Check application logs for errors

### Out of memory
- Increase Docker memory allocation
- Adjust Neo4j memory settings in docker-compose.yml

## License

Apache-2.0