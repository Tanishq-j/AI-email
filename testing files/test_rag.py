from dotenv import load_dotenv
load_dotenv()

from app.graph import graph_app
import pprint

print("--- Testing Live RAG Agent Integration ---")

initial_state = {
    "email_data": {
        "id": "test_rag_001",
        "sender_name": "Alert System",
        "sender_mail": "alerts@system.com",
        "subject": "CRITICAL: Database failure DB_ERR_001",
        "body": "The primary database is down and payment processing is failing. Immediate action required. Error code DB_ERR_001",
        "thread_id": "thr_001",
        "attachment_analysis": "None"
    },
    "user_info": {"name": "Tanishq", "tone_preference": "Professional", "daily_goal": "Keep systems online"}
}

# Invoke the graph directly to observe RAG in the output state
result = graph_app.invoke(initial_state)

print("\n--- FINAL GRAPH STATE ---")
print(f"Classification: {result.get('category')}")
print("Extracted RAG Contexts:")
pprint.pprint(result.get("context", []))
