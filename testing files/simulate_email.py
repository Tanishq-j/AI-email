import requests
import json
import time

URL = "http://localhost:8000/process-email"

payload = {
  "sender_email": "test-client@example.com",
  "subject": "URGENT: Project Deadline Update",
  "content": "Hi Tanishq, we need to move the meeting to 4 PM today. Please confirm."
}

def simulate():
    print(f"--- SIMULATING EMAIL INGESTION ---")
    print(f"Target: {URL}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        print("Sending request... (30s timeout)")
        response = requests.post(URL, json=payload, timeout=30)
        print(f"\nSTATUS CODE: {response.status_code}")
        print(f"RESPONSE: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == "__main__":
    simulate()
