import requests
import json

url = "http://localhost:8000/process-email"

payload = {
    "sender_email": "vendor@supplycorp.com",
    "subject": "Invoice & Blueprint attached for Project Omega",
    "content": "Hi team, please find the architectural blueprint and the Q3 invoice attached. Let me know if the specs are approved so we can proceed.",
    "attachment_analysis": "The attached invoice shows a total due of $45,000. The blueprint image indicates structural changes to the ground floor layout requiring engineering approval."
}

try:
    print("Injecting visual intelligence payload...")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("\nSuccess! Result:")
        print(json.dumps(response.json(), indent=2))
    else:
        print("\nFailed! Error:")
        print(response.text)
        
except Exception as e:
    print(f"Connection failed: {e}")
