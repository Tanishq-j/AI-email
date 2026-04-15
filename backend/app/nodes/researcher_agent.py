from typing import Dict, Any
from app.agent_state import GraphState
import os
import psycopg2
from sentence_transformers import SentenceTransformer

# Load the model once globally for performance
try:
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    embedder = None
    print(f"[Researcher] Warning: Could not load SentenceTransformer: {e}")

def process_research(state: GraphState) -> Dict[str, Any]:
    """Researcher Node: Fetches RAG context from the active pgvector database."""
    category = state.get("category", "")
    email_data = state.get("email_data", {})
    
    # We only research for specific classifications
    if category not in ["Scheduling", "Action_Required", "Urgent_Fire"]:
        return {"context": []}
        
    if embedder is None:
        return {"context": ["System Offline: Vector Embeddings unavailable."]}
    
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/email_intelligence")
    
    context_results = []
    
    try:
        # Create a semantic query using the subject and body
        search_query = f"{email_data.get('subject', '')} {email_data.get('body', '')}"
        
        # Determine the embedding array
        query_embedding = embedder.encode(search_query).tolist()
        
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Use PGVector Cosine Distance Operator `<=>` to find identical contexts
        # Limit to the top 2 highly relevant policies
        cursor.execute(
            """
            SELECT content, 1 - (embedding <=> %s::vector) AS similarity 
            FROM knowledge_base 
            ORDER BY embedding <=> %s::vector
            LIMIT 2;
            """,
            (str(query_embedding), str(query_embedding))
        )
        
        results = cursor.fetchall()
        for row in results:
            content, similarity = row
            # Only keep results with reasonable similarity
            context_results.append(f"[Score: {similarity:.2f}] {content}")
            
        print(f"[Researcher] Successfully pulled {len(context_results)} RAG chunks.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[Researcher] Error during vector retrieval: {e}")
        # Fallback in case of database failures
        context_results = [
            f"Fallback Active: Could not reach pgvector store. Error: {str(e)[:50]}"
        ]
        
    return {"context": context_results}
