import requests
import json

url = 'http://127.0.0.1:8000/chat-assistant'
payload = {
    "message": "Which is the most recent email received? Give sender and subject.",
    "page_context": "dashboard",
    "history": []
}

resp = requests.post(url, json=payload, timeout=30)
print('Status:', resp.status_code)
print('Response:', resp.text)
