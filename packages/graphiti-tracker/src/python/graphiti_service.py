"""
Graphiti Service for UI-AE Action Tracking
Uses Ollama with free models (Gemma 2, Llama 3, etc.) instead of OpenAI
"""
import os
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from graphiti_core import Graphiti
from graphiti_core.nodes import EntityNode, EpisodeNode
from graphiti_core.edges import EntityRelation, EpisodicEdge
from graphiti_core.llm_client import OllamaClient
from graphiti_core.embedder import OllamaEmbedder
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Graphiti instance
graphiti_instance: Optional[Graphiti] = None

# Action tracking models
class UIAction(BaseModel):
    """Represents a UI action performed by the aegnt"""
    action_type: str = Field(..., description="Type of action (click, type, scroll, etc.)")
    action_inputs: Dict[str, Any] = Field(default_factory=dict, description="Action parameters")
    target_element: Optional[Dict[str, Any]] = Field(None, description="Target UI element info")
    timestamp: datetime = Field(default_factory=datetime.now)
    session_id: str = Field(..., description="Current session identifier")
    user_intent: Optional[str] = Field(None, description="User's original intent/command")
    
class ActionResult(BaseModel):
    """Result of an action execution"""
    action_id: str
    success: bool
    error_message: Optional[str] = None
    screenshot_before: Optional[str] = None
    screenshot_after: Optional[str] = None
    execution_time_ms: float
    
class Session(BaseModel):
    """Represents a user session"""
    session_id: str
    user_id: Optional[str] = None
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    goal: Optional[str] = None
    
class QueryRequest(BaseModel):
    """Request for querying the knowledge graph"""
    query: str
    session_id: Optional[str] = None
    limit: int = Field(10, ge=1, le=100)
    
class Episode(BaseModel):
    """Episode to add to the knowledge graph"""
    name: str
    content: str
    entity_names: List[str] = Field(default_factory=list)
    source: str = "ui-ae-desktop"
    reference_time: Optional[datetime] = None

# Initialize Graphiti on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    global graphiti_instance
    
    try:
        # Get configuration from environment
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        neo4j_password = os.getenv("NEO4J_PASSWORD", "password")
        
        # Get Ollama configuration
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        llm_model = os.getenv("OLLAMA_LLM_MODEL", "gemma3n:e2b")  # Gemma 3n e2b - free and powerful
        embedding_model = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
        
        # Initialize LLM client with Ollama
        llm_client = OllamaClient(
            base_url=ollama_base_url,
            model=llm_model
        )
        
        # Initialize embedder with Ollama
        embedder = OllamaEmbedder(
            base_url=ollama_base_url,
            model=embedding_model
        )
        
        logger.info(f"Using Ollama at {ollama_base_url} with model {llm_model}")
        
        # Initialize Graphiti
        graphiti_instance = Graphiti(
            neo4j_uri=neo4j_uri,
            neo4j_user=neo4j_user,
            neo4j_password=neo4j_password,
            llm_client=llm_client,
            embedder=embedder
        )
        
        # Initialize the graph database
        await graphiti_instance.build_indices()
        
        logger.info("Graphiti service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize Graphiti: {e}")
        raise
        
    yield
    
    # Cleanup
    if graphiti_instance:
        await graphiti_instance.close()

# Create FastAPI app
app = FastAPI(
    title="UI-AE Graphiti Tracker",
    description="Knowledge graph service for tracking UI-AE actions",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/actions/track")
async def track_action(action: UIAction) -> Dict[str, Any]:
    """Track a UI action in the knowledge graph"""
    try:
        # Create episode content from action
        episode_content = f"""
        Action: {action.action_type}
        Inputs: {action.action_inputs}
        Target: {action.target_element}
        User Intent: {action.user_intent or 'Not specified'}
        Session: {action.session_id}
        Time: {action.timestamp.isoformat()}
        """
        
        # Extract entity names (action type, session, target element if available)
        entity_names = [action.action_type, f"session_{action.session_id}"]
        if action.target_element and "name" in action.target_element:
            entity_names.append(action.target_element["name"])
            
        # Add episode to graph
        episode = Episode(
            name=f"{action.action_type}_{action.timestamp.timestamp()}",
            content=episode_content,
            entity_names=entity_names,
            reference_time=action.timestamp
        )
        
        await graphiti_instance.add_episode(
            name=episode.name,
            episode_body=episode.content,
            source=episode.source,
            reference_time=episode.reference_time,
            entities=episode.entity_names
        )
        
        return {
            "status": "success",
            "action_id": f"{action.session_id}_{action.timestamp.timestamp()}",
            "message": "Action tracked successfully"
        }
        
    except Exception as e:
        logger.error(f"Error tracking action: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/actions/result")
async def track_action_result(result: ActionResult) -> Dict[str, Any]:
    """Track the result of an action execution"""
    try:
        # Create episode for action result
        episode_content = f"""
        Action Result: {result.action_id}
        Success: {result.success}
        Error: {result.error_message or 'None'}
        Execution Time: {result.execution_time_ms}ms
        """
        
        entity_names = [f"action_{result.action_id}", "action_result"]
        if not result.success:
            entity_names.append("error")
            
        await graphiti_instance.add_episode(
            name=f"result_{result.action_id}",
            episode_body=episode_content,
            source="ui-ae-desktop",
            entities=entity_names
        )
        
        return {
            "status": "success",
            "message": "Action result tracked successfully"
        }
        
    except Exception as e:
        logger.error(f"Error tracking action result: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/start")
async def start_session(session: Session) -> Dict[str, Any]:
    """Start a new tracking session"""
    try:
        episode_content = f"""
        New Session Started: {session.session_id}
        User: {session.user_id or 'Anonymous'}
        Goal: {session.goal or 'Not specified'}
        Start Time: {session.start_time.isoformat()}
        """
        
        await graphiti_instance.add_episode(
            name=f"session_start_{session.session_id}",
            episode_body=episode_content,
            source="ui-ae-desktop",
            reference_time=session.start_time,
            entities=[f"session_{session.session_id}", "session_start"]
        )
        
        return {
            "status": "success",
            "session_id": session.session_id,
            "message": "Session started successfully"
        }
        
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/end")
async def end_session(session_id: str) -> Dict[str, Any]:
    """End a tracking session"""
    try:
        end_time = datetime.now()
        episode_content = f"""
        Session Ended: {session_id}
        End Time: {end_time.isoformat()}
        """
        
        await graphiti_instance.add_episode(
            name=f"session_end_{session_id}",
            episode_body=episode_content,
            source="ui-ae-desktop",
            reference_time=end_time,
            entities=[f"session_{session_id}", "session_end"]
        )
        
        return {
            "status": "success",
            "session_id": session_id,
            "message": "Session ended successfully"
        }
        
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_graph(request: QueryRequest) -> Dict[str, Any]:
    """Query the knowledge graph"""
    try:
        # Search for relevant episodes
        results = await graphiti_instance.search(
            query=request.query,
            num_results=request.limit
        )
        
        # Filter by session if provided
        if request.session_id:
            results = [r for r in results if f"session_{request.session_id}" in str(r)]
            
        return {
            "status": "success",
            "query": request.query,
            "results": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Error querying graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ui-ae-graphiti-tracker",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("GRAPHITI_SERVICE_PORT", "8100"))
    uvicorn.run(app, host="0.0.0.0", port=port)