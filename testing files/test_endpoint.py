import requests
import json

try:
    response = requests.get('http://127.0.0.1:8000/process-email')
    data = response.json()
    
    if 'emails' in data:
        print(f"✅ Successfully fetched {len(data['emails'])} emails from backend\n")
        
        if data['emails']:
            print("First 3 emails:")
            for email in data['emails'][:3]:
                print(f"\nID: {email['id']}")
                print(f"From: {email['sender_email']}")
                print(f"Subject: {email['subject'][:60]}")
                print(f"Classification: {email['classification']}")
        else:
            print("⚠️ No emails in response")
    else:
        print(f"❌ Unexpected response format: {data.keys()}")
        
except Exception as e:
    print(f"❌ Error: {e}")
