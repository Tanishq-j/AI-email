import requests
import os
from dotenv import load_dotenv
load_dotenv()

url = os.getenv('N8N_SCHEDULING_WEBHOOK', 'NOT SET')
print(f'N8N_SCHEDULING_WEBHOOK: {url}')

# Check if n8n is reachable on that URL
try:
    test = requests.head(url, timeout=3)
    print(f'n8n webhook reachable: HTTP {test.status_code}')
except Exception as e:
    print(f'n8n webhook NOT reachable: {e}')

# Check current drafts
r = requests.get('http://localhost:8000/drafts', timeout=5)
drafts = r.json().get('drafts', [])
print(f'Current drafts in DB: {len(drafts)}')
for d in drafts[:5]:
    print(f'  id={d["id"]} | type={d["type"]} | status={d["status"]} | recipient={d["recipient"]}')
