import requests
import time

url = "http://127.0.0.1:8000/process-email"

payload = {
    "sender": "boss@corporatedomain.com",
    "receiver": "exampletcj@gmail.com",
    "subject": "Testing Email Gateway",
    "body": "This is a dummy email hitting the process-email endpoint",
    "is_1on1": False
}

print(f"Waiting for server to fully initialize...")
time.sleep(2)
try:
    print(f"Sending POST to {url}")
    response = requests.post(url, json=payload, timeout=10)
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Failed to reach server:", e)
