from fastapi import FastAPI, BackgroundTasks, Request
from pydantic import BaseModel
from typing import Dict, Any, List
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
import time

from app.graph import graph_app
from app.agent_state import GraphState
from app.dispatcher import dispatch_command
from app.vision_parser import parse_vision_analysis, format_vision_card
from app.routers.monitor import router as monitor_router
from dotenv import load_dotenv

load_dotenv() # Load variables from .env

app = FastAPI(title="Smart Email Assistant Gateway", version="1.0.0")

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    log_file = "requests.log"
    msg = f"{time.ctime()} | {request.method} {request.url}\n"
    print(f"[REQLOG] {msg.strip()}")
    try:
        with open(log_file, "a") as f:
            f.write(msg)
    except:
        pass
    return await call_next(request)

# Explicitly allow Vite development port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Isolated read-only monitor router (zero disturbance to agent logic) ---
app.include_router(monitor_router)

redis_client = None
try:
    import redis
    redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True)
except Exception as e:
    print(f"Redis connection error: {e}")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/email_intelligence")
print(f"DATABASE_ID: {DATABASE_URL}")

class EmailInput(BaseModel):
    sender_email: str
    subject: str
    content: str
    is_1on1: bool = False
    attachment_analysis: str = ""
    received_at: str | None = None

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
        "attachment_analysis": email_dict.get("attachment_analysis", ""),
        "email_received_at": email_dict.get("received_at")
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

    # ── Step 1: Persist to DB FIRST so we get the real row ID ──────────────────
    new_row_id = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Authoritative urgency: use the value the Classifier node placed in state.
        # This is already on the 0-100 scale.
        authoritative_urgency = result.get('urgency_score', 0)
        try:
            authoritative_urgency = int(float(authoritative_urgency))
        except (TypeError, ValueError):
            authoritative_urgency = 0

        # Merge email input with the brain's intelligence
        dashboard_data = email.model_dump()
        dashboard_data['classification']        = result.get('category', 'FYI_Read')
        dashboard_data['urgency_score']         = authoritative_urgency
        dashboard_data['short_summary']         = result.get('short_summary', '')
        dashboard_data['suggested_draft']       = cmd_package.get('suggested_draft', '')
        dashboard_data['intelligence_reasoning']= cmd_package.get('intelligence_reasoning', '')
        dashboard_data['analysis']              = cmd_package.get('payload', {}).get('analysis', {})

        # Keep the urgency_score inside the analysis sub-object consistent too
        if isinstance(dashboard_data['analysis'], dict):
            dashboard_data['analysis']['urgency_score'] = authoritative_urgency

        received_at_val = dashboard_data.get('received_at')

        if received_at_val:
            cursor.execute(
                "INSERT INTO email_actions (payload, email_received_at) VALUES (%s, %s) RETURNING id",
                (json.dumps(dashboard_data), received_at_val)
            )
        else:
            cursor.execute(
                "INSERT INTO email_actions (payload) VALUES (%s) RETURNING id",
                (json.dumps(dashboard_data),)
            )
        new_row_id = cursor.fetchone()[0]
        conn.commit()
        print(f"[Gateway] Persisted to DB. New email_actions.id = {new_row_id}")
    except Exception as e:
        print(f"DB Insert error: {e}")
    finally:
        if 'conn' in locals(): conn.close()

    # ── Step 2: Inject the real DB id before dispatching to n8n ───────────────
    # n8n's Save Draft node uses email_action_id as the foreign key.
    if new_row_id is not None:
        cmd_package["email_action_id"] = new_row_id
        payload_ref = cmd_package.get("payload", {})
        payload_ref["card_id"] = new_row_id
        payload_ref["email_action_id"] = new_row_id
        cmd_package["payload"] = payload_ref

    # ── Step 3: Dispatch to n8n (background — non-blocking) ────────────────────
    # For Scheduling: n8n's Master Meeting Controller performs slot-hunting
    # in Google Calendar and creates the final draft proposal card.
    # For Urgent_Fire: n8n handles the tiered escalation ladder.
    background_tasks.add_task(dispatch_command, cmd_package)

    return {
        "status": "success",
        "email_action_id": new_row_id,
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
        cursor.execute("SELECT * FROM email_actions ORDER BY COALESCE(email_received_at, created_at) DESC LIMIT 50")
        rows = cursor.fetchall()
        
        # Format for dashboard
        formatted_emails = []
        for row in rows:
            try:
                p = row['payload']
                if not p or not isinstance(p, dict):
                    continue
                attachment_analysis = p.get('attachment_analysis', '')
                
                vision_data = None
                if attachment_analysis and attachment_analysis.lower() not in ['no attachment', 'none', '']:
                    parsed = parse_vision_analysis(attachment_analysis)
                    vision_data = format_vision_card(parsed)
                
                # Safe timestamp logic
                ts = None
                try:
                    raw_received = row.get('email_received_at')
                    raw_created = row.get('created_at')
                    if raw_received and hasattr(raw_received, 'isoformat'):
                        ts = raw_received.isoformat()
                    elif raw_created and hasattr(raw_created, 'isoformat'):
                        ts = raw_created.isoformat()
                except:
                    pass

                formatted_emails.append({
                    "id": row['id'],
                    "sender_email": p.get('sender_email', 'unknown@corp.com'),
                    "subject": p.get('subject', 'No Subject'),
                    "content": p.get('content', ''),
                    "classification": p.get('classification', 'FYI_Read'),
                    "attachment_analysis": attachment_analysis,
                    "vision_data": vision_data,
                    "urgency_score": p.get('urgency_score', 0),
                    "suggested_draft": p.get('suggested_draft', ''),
                    "intelligence_reasoning": p.get('intelligence_reasoning', ''),
                    "timestamp": ts
                })
            except Exception as row_err:
                print(f"Error processing row {row.get('id')}: {row_err}")
                continue
                
        return {"emails": formatted_emails}
    except Exception as e:
        print(f"DB Fetch Error: {e}")
        return {"emails": [], "debug_error": str(e)}
    finally:
        if 'conn' in locals(): conn.close()
# ── DRAFTS & SCHEDULING ──────────────────────────────────────
class DraftCreate(BaseModel):
    email_action_id: int | None = None
    content: str
    recipient: str
    subject: str
    type: str
    tags: List[str] = []
    reasoning: str | None = None
    suggested_slots: List[str] = []

class DraftUpdate(BaseModel):
    content: str

class SchedulingUpdate(BaseModel):
    status: str
    scheduled_time: str | None = None

@app.get("/drafts")
def get_drafts():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM draft_replies WHERE status = 'Pending' ORDER BY created_at DESC")
        return {"drafts": cursor.fetchall()}
    except Exception as e:
        print(f"Draft fetch error: {e}")
        return {"drafts": []}
    finally:
        if 'conn' in locals(): conn.close()

@app.post("/drafts")
def create_draft(draft: DraftCreate):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO draft_replies (email_action_id, content, recipient, subject, type, tags, reasoning, suggested_slots)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """, (draft.email_action_id, draft.content, draft.recipient, draft.subject, draft.type, draft.tags, draft.reasoning, json.dumps(draft.suggested_slots)))
        new_id = cursor.fetchone()[0]
        conn.commit()
        return {"status": "success", "id": new_id}
    except Exception as e:
        print(f"Draft create error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'conn' in locals(): conn.close()

@app.put("/drafts/{draft_id}")
def update_draft(draft_id: int, draft: DraftUpdate):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("UPDATE draft_replies SET content = %s WHERE id = %s", (draft.content, draft_id))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Draft update error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'conn' in locals(): conn.close()

@app.delete("/drafts/{draft_id}")
def delete_draft(draft_id: int):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM draft_replies WHERE id = %s", (draft_id,))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Draft delete error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'conn' in locals(): conn.close()


@app.post("/execute-draft/{draft_id}")
def execute_draft_v2(draft_id: int):
    # This triggers the n8n "Draft Execution" workflow.
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM draft_replies WHERE id = %s", (draft_id,))
        draft = cursor.fetchone()
        
        if not draft:
            return {"status": "error", "message": "Draft not found"}

        # Logic to trigger n8n
        n8n_url = os.getenv("N8N_DRAFT_EXECUTION_URL", "http://localhost:5678/webhook/execute-draft")
        import requests
        try:
            resp = requests.post(n8n_url, json=draft, timeout=5)
            resp.raise_for_status()
        except Exception as n8err:
            print(f"n8n trigger failed: {n8err}")
        
        cursor.execute("UPDATE draft_replies SET status = 'Executed' WHERE id = %s", (draft_id,))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Draft execution error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'conn' in locals(): conn.close()

@app.get("/scheduled-emails")
def get_scheduled_emails():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT id, payload->>'sender_email' as sender, payload->>'subject' as subject, 
            scheduling_status, scheduled_time, google_event_id 
            FROM email_actions 
            WHERE scheduling_status = 'Confirmed'
            ORDER BY COALESCE(scheduled_time, '2099-01-01'::timestamp) ASC
        """)
        return {"scheduled": cursor.fetchall()}
    except Exception as e:
        print(f"Scheduled fetch error details: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"scheduled": []}
    finally:
        if 'conn' in locals(): conn.close()

@app.put("/email-actions/{id}/scheduling")
def update_email_scheduling(id: int, update: SchedulingUpdate):
    try:
        # Redis Lock implementation (5 minutes)
        if redis_client:
            lock_key = f"lock:mail:{id}"
            if redis_client.exists(lock_key):
                return {"status": "error", "message": "Mail is currently locked for processing. Please wait 5 minutes."}
            redis_client.setex(lock_key, 300, "locked")

        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE email_actions 
            SET scheduling_status = %s, scheduled_time = %s 
            WHERE id = %s
        """, (update.status, update.scheduled_time, id))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Scheduling update error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'conn' in locals(): conn.close()

class ConfirmUpdate(BaseModel):
    google_event_id: str
    scheduled_time: str | None = None

class TimeUpdate(BaseModel):
    scheduled_time: str

@app.patch("/email-actions/{id}/set-time")
def set_email_time(id: int, update: TimeUpdate):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("UPDATE email_actions SET scheduled_time = %s WHERE id = %s", (update.scheduled_time, id))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Set time error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'conn' in locals(): conn.close()

@app.patch("/email-actions/{id}/confirm")
def confirm_email_meeting(id: int, update: ConfirmUpdate):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE email_actions 
            SET scheduling_status = 'Confirmed', 
                google_event_id = %s,
                scheduled_time = COALESCE(%s, scheduled_time)
            WHERE id = %s
        """, (update.google_event_id, update.scheduled_time, id))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Confirmation update error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'conn' in locals(): conn.close()

@app.put("/email-actions/{id}/ignore")
def ignore_email_action(id: int):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("UPDATE email_actions SET scheduling_status = 'Ignored' WHERE id = %s", (id,))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Ignore update error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'conn' in locals(): conn.close()


# ── AI ASSISTANT CONFIG ───────────────────────────────────
from langchain_groq import ChatGroq
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
    AI Assistant Endpoint: Processes user queries using Llama 3.3 70B
    with knowledge of the LIVE user profile and recent email history.
    """
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.7, groq_api_key=groq_api_key)
    
    # 1. Fetch live user profile
    profile = await get_user_profile()
    
    # 2. Fetch some email context (explicitly include effective timestamps so the model can determine newest-first)
    email_context = ""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT id, payload, created_at, email_received_at FROM email_actions ORDER BY COALESCE(email_received_at, created_at) DESC LIMIT 10")
        rows = cursor.fetchall()

        enriched = []
        for r in rows:
            payload = r['payload']
            # payload may be stored as JSONB (dict) or text
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except Exception:
                    pass

            effective_ts = r['email_received_at'] if r.get('email_received_at') else r.get('created_at')
            enriched.append({
                "id": r['id'],
                "effective_received_at": (effective_ts.isoformat() if effective_ts else None),
                "created_at": (r['created_at'].isoformat() if r.get('created_at') else None),
                "payload": payload
            })

        # Make it explicit to the LLM that the list is ordered newest-first
        email_context = "NOTE: The following list is ordered newest-first (index 0 is the most recent).\n" + json.dumps(enriched, indent=2)
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
        content = response.content
        if isinstance(content, list):
            text_parts = [part.get("text", "") if isinstance(part, dict) else str(part) for part in content]
            text = "".join(text_parts).strip()
        else:
            text = str(content).strip()
        return {"text": text}
    except Exception as e:
        return {"text": f"I'm sorry, I encountered an error: {str(e)}"}
