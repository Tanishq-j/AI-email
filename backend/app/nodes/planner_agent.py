from typing import Dict, Any
import json
import os
import re
import requests
from app.agent_state import GraphState

def process_planner(state: GraphState) -> Dict[str, Any]:
    """Planner Node: Generates the command package for n8n automation using Groq."""
    category = state.get("category", "")
    classification = state.get("classification", "")
    user_info = state.get("user_info", {})
    context = state.get("context", [])
    short_summary = state.get("short_summary", "Email received.")
    email_data = state.get("email_data", {})
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "your_api_key_here")
    
    prompt = f"""You are the SoMailer Agentic Brain. 
Generate a command package for n8n automation based on the following email intelligence.

Email Subject: {email_data.get("subject", "")}
Email Body: {email_data.get("body", "")}
Category: {category}
Summary: {short_summary}
User Info: {json.dumps(user_info)}
Historical Context: {json.dumps(context)}

STRICT OUTPUT RULE: Output ONLY a raw JSON object. No markdown, no code blocks, no prose.
Structure:
{{
  "action": "trigger_incident | propose_times | draft_task | archive_or_notify | spam_filter",
  "status": "escalated | resolved | false_positive | confirm | pending",
  "payload": {{
    "summary": "High-density actionable summary",
    "card_id": "uuid-placeholder-or-db-id",
    "analysis": {{
      "entities": {{
        "issue_type": "Server Down",
        "affected_system": "Production",
        "routing": "DevOps",
        "error_code": "ERR_500"
      }},
      "urgency_score": 9
    }},
    "mail": {{
      "id": "mock_mail_id_123",
      "body": "{email_data.get('body', '')}",
      "sender_name": "{email_data.get('sender', 'unknown')}",
      "sender_mail": "{email_data.get('sender', 'unknown')}",
      "subject": "{email_data.get('subject', '')}"
    }},
    "alert": {{
      "alert_message": "Short alert text",
      "recipient_name": "{user_info.get('name', 'User')}"
    }},
    "draft_message": {{
      "id": "mock_draft_123"
    }},
    "event": {{
      "id": "mock_event_123"
    }},
    "jira": {{
      "id": "AUTO-GEN",
      "ticket_link": "https://jira.corporate.com/browse/AUTO-GEN"
    }}
  }}
}}"""

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0,
                "response_format": {"type": "json_object"}
            },
            timeout=10
        )
        response.raise_for_status()
        result = response.json()
        text = result['choices'][0]['message']['content'].strip()
        command_package = json.loads(text)
            
    except Exception as e:
        print(f"[Planner] Groq Error: {e}. Falling back to rule-based mapping.")
        # Fallback to rule-based mapping if LLM fails
        command_package = {
            "action": "none",
            "payload": {"summary": short_summary}
        }
        if category == "Urgent_Fire":
            command_package["action"] = "trigger_incident"
            command_package["status"] = "escalated"
            command_package["payload"] = {
                "summary": short_summary,
                "analysis": {"entities": {"issue_type": "Urgent Alert", "affected_system": "General", "routing": "Admin"}, "urgency_score": 10},
                "mail": {"sender_name": email_data.get("sender"), "sender_mail": email_data.get("sender"), "subject": email_data.get("subject")},
                "alert": {"alert_message": short_summary, "recipient_name": user_info.get("name", "User")},
                "jira": {"id": "INC-101", "ticket_link": "#"}
            }
        elif category == "Scheduling":
            command_package["action"] = "propose_times"
            command_package["status"] = "pending"
            command_package["payload"] = {"summary": short_summary}
        elif category == "Action_Required":
            command_package["action"] = "draft_task"
            command_package["payload"] = {"summary": short_summary}
        elif category == "FYI_Read":
            command_package["action"] = "archive_or_notify"
            command_package["payload"] = {"summary": short_summary}
        else:
            command_package["action"] = "spam_filter"
            command_package["payload"] = {"summary": "Spam filtered."}

    # Force injection of strictly required n8n fields
    payload = command_package.get("payload", {})
    if "card_id" not in payload: payload["card_id"] = "mock_db_card_123"
    
    if "mail" not in payload: payload["mail"] = {}
    payload["mail"]["id"] = "mock_mail_id_123"
    if "body" not in payload["mail"]: payload["mail"]["body"] = email_data.get("body", "No body")
    
    if "draft_message" not in payload: payload["draft_message"] = {"id": "mock_draft_123"}
    if "event" not in payload: payload["event"] = {"id": "mock_event_123"}
    if "jira" not in payload: payload["jira"] = {"id": "AUTO-GEN", "ticket_link": "https://jira.corporate.com/browse/AUTO"}
    
    if "alert" not in payload:
        payload["alert"] = {"alert_message": short_summary, "recipient_name": user_info.get("name", "User")}
        
    command_package["payload"] = payload
    command_package["classification"] = category
    return {"command_package": command_package}
