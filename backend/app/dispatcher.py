import os
import requests

# Default mock URL for webhook-test
N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL", "http://localhost:5678/webhook-test/email-action")

def dispatch_command(command_package: dict):
    """
    Reads the command_package and sends the payload to the correct n8n Webhook URL.
    """
    print(f"--- Dispatcher Activated ---")
    print(f"Target URL: {N8N_WEBHOOK_URL}")
    print(f"Payload: {command_package}")
    
    try:
        response = requests.post(N8N_WEBHOOK_URL, json=command_package, timeout=3)
        print(f"n8n responded with status code: {response.status_code}")
        return response.status_code
    except requests.exceptions.RequestException as e:
        print(f"n8n Request failed (n8n is likely offline or mocked URL used): {e}")
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
