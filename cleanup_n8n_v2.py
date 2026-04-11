import json
import os

def load_json(name):
    # Prefer Final version if it exists
    path = 'n8n/Final ' + name if os.path.exists('n8n/Final ' + name) else 'n8n/' + name
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save_json(name, data):
    with open('n8n/Cleaned ' + name, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

files = ['Main Automation.json', 'Post Scheduling.json', 'Post Urgent_Fire.json']

# Task 1: Clean Main Automation
main_data = load_json('Main Automation.json')
cleaned_nodes = []
allowed_node_types = ['n8n-nodes-base.gmailTrigger', 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.code']
# Specifically keeping "Gmail Trigger", "Code in JavaScript" and "FastAPI Gateway"
gmail_node_name = None
code_node_name = None
gateway_node_name = None

for n in main_data.get('nodes', []):
    if 'gmailTrigger' in n.get('type') and 'Gmail' in n.get('name'):
        gmail_node_name = n['name']
        cleaned_nodes.append(n)
    elif 'code' in n.get('type') and 'Code in JavaScript' in n.get('name'):
        # Just keep the first/main Code in JavaScript node
        if not code_node_name:
            code_node_name = n['name']
            cleaned_nodes.append(n)
    elif 'httpRequest' in n.get('type') and 'Gateway' in n.get('name'):
        gateway_node_name = n['name']
        # Map body to sender_email, subject, content
        if 'parameters' not in n: n['parameters'] = {}
        if 'bodyParameters' not in n['parameters']: n['parameters']['bodyParameters'] = {}
        n['parameters']['bodyParameters']['parameters'] = [
            {'name': 'sender_email', 'value': '={{$json.sender}}'},
            {'name': 'subject', 'value': '={{$json.subject}}'},
            {'name': 'content', 'value': '={{$json.content}}'}
        ]
        cleaned_nodes.append(n)

# Re-wire exactly the linear path
main_data['nodes'] = cleaned_nodes
main_data['connections'] = {}
if gmail_node_name and code_node_name:
    main_data['connections'][gmail_node_name] = {'main': [[{'node': code_node_name, 'type': 'main', 'index': 0}]]}
if code_node_name and gateway_node_name:
    main_data['connections'][code_node_name] = {'main': [[{'node': gateway_node_name, 'type': 'main', 'index': 0}]]}

save_json('Main Automation.json', main_data)

# Process all 3 workflows to fix DB mappings
for file_name in files:
    if file_name == 'Main Automation.json':
        data = load_json('Main Automation.json')
        # Wait, I just saved it as 'Cleaned Main Automation.json', but load_json prefers 'Final '
        pass 
        
    data = load_json(file_name)
    if file_name == 'Main Automation.json':
        # Re-load the cleaned one since we didn't add logic to load 'Cleaned ' automatically
        with open('n8n/Cleaned Main Automation.json', encoding='utf-8') as f:
            data = json.load(f)

    for n in data.get('nodes', []):
        if n.get('type') == 'n8n-nodes-base.postgres':
            # Assure credentials object mapping
            n['credentials'] = {
                "postgres": {
                    "id": "1",
                    "name": "Shared Postgres"
                }
            }               
    save_json(file_name, data)

print('Deep cleanup and mapping executed.')
