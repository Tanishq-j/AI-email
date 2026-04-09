from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any

from app.graph import graph_app
from app.agent_state import GraphState
from app.dispatcher import dispatch_command

app = FastAPI(title="Smart Email Assistant Gateway", version="1.0.0")

class EmailInput(BaseModel):
    sender: str
    receiver: str
    subject: str
    body: str
    is_1on1: bool = False

@app.post("/process-email")
def process_email_endpoint(email: EmailInput, background_tasks: BackgroundTasks):
    """
    Receives raw email data (e.g. from n8n), triggers the LangGraph brain,
    and returns the formulated command_package.
    """
    # Build complete initial state
    initial_state = GraphState(
        email_data=email.model_dump(),
        user_info={},
        classification=None,
        category=None,
        urgency_score=None,
        short_summary=None,
        context=[],
        command_package={}
    )
    
    # Trigger LangGraph
    print("\n[Gateway] Triggering Graph Invocation...")
    result = graph_app.invoke(initial_state)
    
    cmd_package = result.get('command_package', {"action": "fallback", "payload": {}})
    
    # Dispatch payload functionally to n8n Webhook
    background_tasks.add_task(dispatch_command, cmd_package)
    
    return {
        "status": "success",
        "command_package": cmd_package
    }
