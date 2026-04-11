import json
import os

def load_json(name):
    path = 'n8n/Modified ' + name if os.path.exists('n8n/Modified ' + name) else 'n8n/' + name
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save_json(name, data):
    with open('n8n/Final ' + name, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

files = ['Main Automation.json', 'Post Scheduling.json', 'Post Urgent_Fire.json']

for file_name in files:
    data = load_json(file_name)
    nodes = data.get('nodes', [])
    for n in nodes:
        # Replace Notion
        if n.get('type') == 'n8n-nodes-base.notion':
            n['type'] = 'n8n-nodes-base.postgres'
            n['typeVersion'] = 2.4
            n['parameters'] = {
                'operation': 'insert',
                'schema': 'public',
                'table': 'tasks',
                'columns': 'summary,sender,due_date'
            }
        # Replace Firebase
        elif n.get('type') == 'n8n-nodes-base.googleFirebaseCloudFirestore':
            n['type'] = 'n8n-nodes-base.postgres'
            n['typeVersion'] = 2.4
            n['parameters'] = {
                'operation': 'insert',
                'schema': 'public',
                'table': 'email_actions',
                'columns': 'payload'
            }
            
    # Verify no Firebase or Notion nodes left
    for n in nodes:
        t = str(n.get('type', '')).lower()
        if 'notion' in t or 'firebase' in t:
            node_name = n.get('name', 'Unknown')
            print("Warning: unreplaced node " + node_name + " in " + file_name)
            
    save_json(file_name, data)

print('Final cleanup complete.')
