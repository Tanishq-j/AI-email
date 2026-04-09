from typing import Dict, Any
from app.agent_state import GraphState

def process_planner(state: GraphState) -> Dict[str, Any]:
    """Planner Node: Generates the command package for n8n."""
    category = state.get("category", "")
    classification = state.get("classification", "")
    user_info = state.get("user_info", {})
    context = state.get("context", [])
    
    working_hours = user_info.get("working_hours", "09:00-17:00")
    priority_projects = user_info.get("priority_projects", "None specified")
    
    command_package = {
        "action": "none",
        "payload": {}
    }
    
    if category == "Urgent_Fire":
        command_package["action"] = "trigger_incident"
        command_package["payload"] = {
            "channel": "twilio_call_and_jira",
            "message": f"URGENT ALERT: {state.get('short_summary', '')}"
        }
    elif category == "Scheduling":
        command_package["action"] = "propose_times"
        command_package["payload"] = {
            "suggested_hours": working_hours,
            "context_hints": context
        }
    elif category == "Action_Required":
        command_package["action"] = "draft_task"
        command_package["payload"] = {
            "platform": "Notion/Jira",
            "priority_context": priority_projects,
            "task_summary": state.get("short_summary", "")
        }
    elif category == "FYI_Read":
        command_package["action"] = "archive_or_notify"
        command_package["payload"] = {
            "summary": state.get("short_summary", "")
        }
    elif category == "Cold_Outreach":
        command_package["action"] = "spam_filter"
        
    command_package["classification"] = classification
    
    return {"command_package": command_package}
