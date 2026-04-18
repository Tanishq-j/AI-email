from typing import Dict, Any
import json
import os
import requests
from app.agent_state import GraphState

def process_planner(state: GraphState) -> Dict[str, Any]:
    """Planner Node: Generates the command package for n8n automation using Groq."""
    category = state.get("category", "")
    user_info = state.get("user_info", {})
    context = state.get("context", [])
    short_summary = state.get("short_summary", "Email received.")
    email_data = state.get("email_data", {})

    # ── Authoritative urgency score comes from the Classifier node ─────────────
    # The classifier already outputs on the 0-100 scale.  We use this as the
    # single source of truth so the planner NEVER overwrites it with a bad value.
    classifier_urgency: int = int(state.get("urgency_score") or 10)

    groq_api_key = os.environ.get("GROQ_API_KEY", "your_api_key_here")

    # Map category → action for the prompt hint
    action_hint_map = {
        "Urgent_Fire":      "trigger_incident",
        "Scheduling":       "propose_times",
        "Action_Required":  "draft_task",
        "FYI_Read":         "archive_or_notify",
        "Cold_Outreach":    "spam_filter",
    }
    action_hint = action_hint_map.get(category, "archive_or_notify")

    prompt = f"""You are the SoMailer Agentic Brain. Generate a JSON command package for n8n automation.

Email Subject: {email_data.get("subject", "")}
Email Body: {email_data.get("body", "")}
Category: {category}  (action should be: {action_hint})
Urgency Score (0-100): {classifier_urgency}
Summary: {short_summary}
User Info: {json.dumps(user_info)}
Historical Context: {json.dumps(context)}

STRICT OUTPUT RULE: Output ONLY a raw JSON object. No markdown, no code blocks, no prose.

DRAFT WRITING RULES:
- For Scheduling emails: Write a complete, professional reply that (1) acknowledges the meeting request,
  (2) mentions the specific times the sender proposed if they listed any, (3) asks them to confirm
  which slot works or proposes availability if none were given. End with the user signature.
- For Urgent_Fire emails: Write a brief professional acknowledgement confirming you received the alert
  and are investigating. Mention the affected system from the email. End with the user signature.
- For all others: Write an appropriate short reply based on context.

Required JSON structure (fill real values — do NOT use placeholder text):
{{
  "action": "{action_hint}",
  "status": "{'escalated' if category == 'Urgent_Fire' else 'pending'}",
  "suggested_draft": "A complete, contextual email reply. Tone: {user_info.get('tone_preference', 'Professional')}. Signature: {user_info.get('signature', '')}",
  "intelligence_reasoning": "One sentence explaining why this action was chosen.",
  "payload": {{
    "summary": "{short_summary}",
    "card_id": "mock_db_card_123",
    "analysis": {{
      "entities": {{
        "issue_type": "describe the issue type",
        "affected_system": "describe affected system if any",
        "routing": "DevOps | Support | Scheduling | General",
        "error_code": "N/A"
      }},
      "urgency_score": {classifier_urgency},
      "summary": "{short_summary}"
    }},
    "mail": {{
      "id": "mock_mail_id_123",
      "body": "email body excerpt",
      "sender_name": "{email_data.get('sender', 'Unknown')}",
      "sender_mail": "{email_data.get('sender', 'unknown@external.com')}",
      "subject": "{email_data.get('subject', '')}"
    }},
    "alert": {{
      "alert_message": "short descriptive alert",
      "recipient_name": "{user_info.get('name', 'User')}"
    }},
    "draft_message": {{"id": "mock_draft_123"}},
    "event": {{"id": "mock_event_123"}},
    "jira": {{"id": "AUTO-GEN", "ticket_link": "https://jira.corporate.com/browse/AUTO-GEN"}}
  }}
}}"""

    command_package = None
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
            timeout=15
        )
        response.raise_for_status()
        # NOTE: result is the Groq HTTP envelope — access the actual LLM text via choices[0]
        groq_envelope = response.json()
        text = groq_envelope['choices'][0]['message']['content'].strip()
        command_package = json.loads(text)
        print(f"[Planner] LLM command package received. Action: {command_package.get('action')}")

    except Exception as e:
        print(f"[Planner] Groq Error: {e}. Falling back to rule-based mapping.")

    # ── Rule-based fallback (used when LLM fails) ──────────────────────────────
    if command_package is None:
        command_package = {
            "action": action_hint,
            "status": "escalated" if category == "Urgent_Fire" else "pending",
            "suggested_draft": "",
            "intelligence_reasoning": f"Rule-based fallback for category: {category}",
            "payload": {
                "summary": short_summary,
                "card_id": "mock_db_card_123",
                "analysis": {
                    "entities": {
                        "issue_type": category,
                        "affected_system": "General",
                        "routing": "Admin",
                        "error_code": "N/A"
                    },
                    "urgency_score": classifier_urgency,
                    "summary": short_summary
                },
                "mail": {
                    "id": "mock_mail_id_123",
                    "body": email_data.get("body", ""),
                    "sender_name": email_data.get("sender", "Unknown"),
                    "sender_mail": email_data.get("sender", "unknown@external.com"),
                    "subject": email_data.get("subject", "")
                },
                "alert": {
                    "alert_message": short_summary,
                    "recipient_name": user_info.get("name", "User")
                },
                "draft_message": {"id": "mock_draft_123"},
                "event": {"id": "mock_event_123"},
                "jira": {"id": "INC-101", "ticket_link": "#"}
            }
        }

    # ── Authoritative urgency injection ────────────────────────────────────────
    # ALWAYS overwrite whatever the LLM put in analysis.urgency_score with the
    # classifier's authoritative score.  This prevents the planner from silently
    # reverting to a wrong scale or wrong value.
    payload = command_package.get("payload", {})

    if "card_id" not in payload:
        payload["card_id"] = "mock_db_card_123"

    if "analysis" not in payload:
        payload["analysis"] = {
            "entities": {
                "issue_type": category,
                "affected_system": "General",
                "routing": "Admin",
                "error_code": "N/A"
            },
            "urgency_score": classifier_urgency,
            "summary": short_summary
        }
    else:
        # Overwrite with authoritative classifier score
        payload["analysis"]["urgency_score"] = classifier_urgency
        if "summary" not in payload["analysis"]:
            payload["analysis"]["summary"] = short_summary

    # Ensure all required n8n fields exist
    if "mail" not in payload:
        payload["mail"] = {}
    payload["mail"].setdefault("id", "mock_mail_id_123")
    payload["mail"].setdefault("body", email_data.get("body", ""))
    payload["mail"].setdefault("sender_name", email_data.get("sender", "Unknown"))
    payload["mail"].setdefault("sender_mail", email_data.get("sender", "unknown@external.com"))
    payload["mail"].setdefault("subject", email_data.get("subject", ""))

    if "draft_message" not in payload:
        payload["draft_message"] = {"id": "mock_draft_123"}
    if "event" not in payload:
        payload["event"] = {"id": "mock_event_123"}
    if "jira" not in payload:
        payload["jira"] = {"id": "AUTO-GEN", "ticket_link": "https://jira.corporate.com/browse/AUTO"}
    if "alert" not in payload:
        payload["alert"] = {
            "alert_message": short_summary,
            "recipient_name": user_info.get("name", "User")
        }

    # ── Scheduling-specific fields for Master Meeting Controller Branch 1 ──────
    # n8n expects: action="propose_times", recipient, subject, mail.sender_mail
    if category == "Scheduling":
        command_package["action"] = "propose_times"
        command_package["status"] = "pending"
        # Ensure recipient is top-level for the dispatcher to pass to n8n
        if "recipient" not in command_package:
            command_package["recipient"] = email_data.get("sender", "")
        if "subject" not in command_package:
            command_package["subject"] = email_data.get("subject", "")

    command_package["payload"] = payload
    command_package["classification"] = category
    command_package.setdefault("suggested_draft", "")
    command_package["intelligence_reasoning"] = command_package.get(
        "intelligence_reasoning", f"Processed by SoMailer Brain (category: {category})."
    )

    print(f"[Planner] Final urgency_score injected: {classifier_urgency}%  |  Action: {command_package.get('action')}")
    return {"command_package": command_package}
