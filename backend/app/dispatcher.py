import os
import requests

# Default mock URL for webhook-test
N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL", "http://localhost:5678/webhook-test/email-action")

def dispatch_command(command_package: dict):
    """
    Reads the command_package and sends the payload to the correct n8n Webhook URL.
    Logic: Category-Aware Routing.
    """
    category = command_package.get("classification") # Graph state classification/category
    # Fallback to general if not specified
    target_url = os.environ.get("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/general")

    if category == "Urgent_Fire":
        target_url = os.environ.get("N8N_URGENT_WEBHOOK", target_url)
    elif category == "Scheduling":
        target_url = os.environ.get("N8N_SCHEDULING_WEBHOOK", target_url)

    print(f"--- Dispatcher Activated (Category: {category}) ---")
    print(f"Target URL: {target_url}")
    
    try:
        response = requests.post(target_url, json=command_package, timeout=3)
        print(f"n8n responded with status code: {response.status_code}")
        return response.status_code
    except requests.exceptions.RequestException as e:
        print(f"n8n Request failed: {e}")
        return None

if __name__ == "__main__":
    # Test execution
    test_pkg = {
        "action": "trigger_incident",
        "payload": {
            "channel": "twilio_call_and_jira",
            "message": "URGENT ALERT: [MOCKED] Server failure."
        },
        "classification": "Team"
    }
    dispatch_command(test_pkg)
