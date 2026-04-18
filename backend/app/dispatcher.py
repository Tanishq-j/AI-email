import os
import requests

def dispatch_command(command_package: dict):
    """
    Reads the command_package and sends the payload to the correct n8n Webhook URL.
    Category-aware routing: Urgent_Fire → Post Urgent_Fire v2
                           Scheduling  → Master Meeting Controller
                           Everything else → general webhook (no-op / archive)
    """
    category = command_package.get("classification", "")
    payload_data = command_package.get("payload", {})

    # ── Route selection ─────────────────────────────────────────────────────────
    default_url = os.environ.get("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/general")

    if category == "Urgent_Fire":
        target_url = os.environ.get("N8N_URGENT_WEBHOOK", default_url)
    elif category == "Scheduling":
        target_url = os.environ.get("N8N_SCHEDULING_WEBHOOK", default_url)
    else:
        target_url = default_url

    print(f"--- Dispatcher Activated (Category: {category}) ---")
    print(f"Target URL: {target_url}")

    # ── Build outgoing body ─────────────────────────────────────────────────────
    # Flatten payload_data into the root so n8n nodes can access both
    # $json.body.mail  AND  $json.body.analysis  without extra nesting.
    outgoing_data = {**command_package, **payload_data}

    # ── Scheduling-specific enrichment ─────────────────────────────────────────
    # Master Meeting Controller's Action Switch checks $('Edit Fields').json.current_action
    # which reads from $('Webhook').json.body.action — must be "propose_times".
    # Also needs: recipient, subject, email_action_id for the Save Draft node.
    if category == "Scheduling":
        outgoing_data["action"] = "propose_times"
        # recipient: used in Gen Propose Draft and Save Draft nodes
        outgoing_data.setdefault(
            "recipient",
            command_package.get("recipient")
            or payload_data.get("mail", {}).get("sender_mail", "")
        )
        outgoing_data.setdefault(
            "subject",
            command_package.get("subject")
            or payload_data.get("mail", {}).get("subject", "")
        )
        # email_action_id will be set by main.py after DB insert; we pass a placeholder
        # (n8n will use whatever integer arrives here for the Draft FK)
        outgoing_data.setdefault("email_action_id", None)

    # ── Urgent_Fire-specific enrichment ────────────────────────────────────────
    # Post Urgent_Fire v2 Status Switch checks status=="escalated"
    if category == "Urgent_Fire":
        outgoing_data.setdefault("status", "escalated")
        outgoing_data.setdefault("card_id", payload_data.get("card_id", 1))

    try:
        response = requests.post(target_url, json=outgoing_data, timeout=10)
        print(f"n8n responded with status code: {response.status_code}")
        return response.status_code
    except requests.exceptions.RequestException as e:
        print(f"n8n Request failed (non-blocking): {e}")
        return None


if __name__ == "__main__":
    # Quick smoke test
    test_pkg = {
        "action": "trigger_incident",
        "classification": "Urgent_Fire",
        "payload": {
            "analysis": {"urgency_score": 85},
            "mail": {"sender_name": "QA", "sender_mail": "qa@test.com", "subject": "Test"},
            "alert": {"alert_message": "Test alert", "recipient_name": "User"},
            "jira": {"id": "TEST-001", "ticket_link": "#"}
        }
    }
    dispatch_command(test_pkg)
