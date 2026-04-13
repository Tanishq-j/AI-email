from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import os

from app.graph import graph_app
from app.agent_state import GraphState
from app.dispatcher import dispatch_command
from dotenv import load_dotenv

load_dotenv() # Load variables from .env

app = FastAPI(title="Smart Email Assistant Gateway", version="1.0.0")

# Enable CORS for frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/email_intelligence")

class EmailInput(BaseModel):
    sender_email: str
    subject: str
    content: str
    is_1on1: bool = False
    attachment_analysis: str = ""

@app.post("/process-email")
def process_email_endpoint(email: EmailInput, background_tasks: BackgroundTasks):
    """
    Receives raw email data (e.g. from n8n), triggers the LangGraph brain,
    and returns the formulated command_package.
    """
    # Map 'content' to 'body' for the brain nodes
    email_dict = email.model_dump()
    email_payload = {
        "sender": email_dict.get("sender_email"),
        "receiver": "user@corporate.com",
        "subject": email_dict.get("subject"),
        "body": email_dict.get("content"),
        "is_1on1": email_dict.get("is_1on1", False),
        "attachment_analysis": email_dict.get("attachment_analysis", "")
    }

    # 0. Fetch user profile for graph context
    user_info = {}
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT name, tone_preference, signature, daily_goal FROM user_profiles LIMIT 1")
        user_info = cursor.fetchone() or {}
    except Exception as e:
        print(f"Profile fetch error in gateway: {e}")
    finally:
        if 'conn' in locals(): conn.close()

    initial_state = GraphState(
        email_data=email_payload,
        user_info=user_info,
        classification=None,
        category=None,
        urgency_score=None,
        short_summary=None,
        context=[],
        command_package={}
    )
    
    print("\n[Gateway] Triggering Graph Invocation...")
    result = graph_app.invoke(initial_state)
    cmd_package = result.get('command_package', {"action": "fallback", "payload": {}})
    background_tasks.add_task(dispatch_command, cmd_package)

    # Persistence: Save the transaction to the dashboard table
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Merge email input with the brain's intelligence
        dashboard_data = email.model_dump()
        dashboard_data['classification'] = result.get('category', 'FYI_Read')
        dashboard_data['urgency_score'] = result.get('urgency_score', 0)
        dashboard_data['short_summary'] = result.get('short_summary', '')
        
        import json
        cursor.execute(
            "INSERT INTO email_actions (payload) VALUES (%s)", 
            (json.dumps(dashboard_data),)
        )
        conn.commit()
    except Exception as e:
        print(f"DB Insert error: {e}")
    finally:
        if 'conn' in locals(): conn.close()
    
    return {
        "status": "success",
        "command_package": cmd_package
    }

@app.get("/process-email")
def get_processed_emails():
    """
    Fetches the last 50 processed emails from the email_actions table for the Dashboard.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM email_actions ORDER BY created_at DESC LIMIT 50")
        rows = cursor.fetchall()
        
        # Format for dashboard
        formatted_emails = []
        for row in rows:
            p = row['payload']
            formatted_emails.append({
                "id": row['id'],
                "sender_email": p.get('sender_email', 'unknown@corp.com'),
                "subject": p.get('subject', 'No Subject'),
                "content": p.get('content', ''),
                "classification": p.get('classification', 'FYI_Read'),
                "attachment_analysis": p.get('attachment_analysis', ''),
                "urgency_score": p.get('urgency_score', 0),
                "timestamp": row['created_at'].isoformat() if row['created_at'] else None
            })
            
        return {"emails": formatted_emails}
    except Exception as e:
        print(f"DB Fetch Error: {e}")
        return {"emails": []}
    finally:
        if 'conn' in locals(): conn.close()

# ── AI ASSISTANT CONFIG ───────────────────────────────────
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

class UserProfile(BaseModel):
    name: str
    tone_preference: str
    signature: str
    daily_goal: str

@app.get("/user-profile")
async def get_user_profile():
    """Fetches the persistent user profile from the database."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT name, tone_preference, signature, daily_goal FROM user_profiles LIMIT 1")
        row = cursor.fetchone()
        return row if row else {"name": "User", "tone_preference": "Professional", "signature": "", "daily_goal": ""}
    except Exception as e:
        print(f"Profile fetch error: {e}")
        return {"name": "User", "tone_preference": "Professional", "signature": "", "daily_goal": ""}
    finally:
        if 'conn' in locals(): conn.close()

@app.post("/user-profile")
async def update_user_profile(profile: UserProfile):
    """Updates the persistent user profile in the database."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE user_profiles 
            SET name = %s, tone_preference = %s, signature = %s, daily_goal = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = (SELECT id FROM user_profiles LIMIT 1)
        """, (profile.name, profile.tone_preference, profile.signature, profile.daily_goal))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Profile update error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'conn' in locals(): conn.close()

class ChatRequest(BaseModel):
    message: str
    page_context: str
    history: List[Dict[str, str]]

@app.post("/chat-assistant")
async def chat_assistant(req: ChatRequest):
    """
    AI Assistant Endpoint: Processes user queries using Gemini 2.0 Flash
    with knowledge of the LIVE user profile and recent email history.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.7)
    
    # 1. Fetch live user profile
    profile = await get_user_profile()
    
    # 2. Fetch some email context
    email_context = ""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT payload FROM email_actions ORDER BY created_at DESC LIMIT 10")
        rows = cursor.fetchall()
        emails = [r['payload'] for r in rows]
        email_context = json.dumps(emails, indent=2)
    except Exception as e:
        print(f"Chat context fetch error: {e}")
    finally:
        if 'conn' in locals(): conn.close()

    # 2. Build Prompt (Chain-of-Thought + Agentic Logic)
    system_prompt = f"""You are the SoMailer AI Assistant. You follow a strict 'Logic First' reasoning pattern.
User Profile: {json.dumps(profile)}
Current Page: {req.page_context}

Available Context (Last 10 processed emails):
{email_context}

Reasoning Framework (Always follow this before responding):
1. **Analyze Intent**: Determine exactly what the user is asking.
2. **Context Retrieval**: Look at the current page and provided email history to find relevant facts.
3. **Drafting Strategy**: 
   - If the request is about **Scheduling**: 
     - Check preferred tone ({profile.get('tone_preference')}).
     - Identify time-slots in the relevant email.
     - Propose a draft that asks for confirmation or suggests a clear window.
   - If the request is a **Summary**: Identify actionable intelligence (dates, figures).
4. **Injection**: Ensure the response ends with the user's signature if it's a draft.

Guidelines:
- Maintain the '{profile.get('tone_preference')}' voice of {profile.get('name')}.
- Use the signature: \"{profile.get('signature')}\" for all drafted replies.
- Be proactive. If an email is urgent, suggest the next concrete step."""

    # 3. Convert history to LangChain format (with truncation check handled in frontend, but safe to verify roles)
    messages = [SystemMessage(content=system_prompt)]
    for h in req.history:
        if h['role'] == 'user':
            messages.append(HumanMessage(content=h['text']))
        else:
            messages.append(AIMessage(content=h['text']))
    
    messages.append(HumanMessage(content=req.message))

    try:
        response = llm.invoke(messages)
        return {"text": response.content}
    except Exception as e:
        return {"text": f"I'm sorry, I encountered an error: {str(e)}"}
