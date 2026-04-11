import json

# Fix 1: Vision Main Automation.json
with open('n8n/Vision Main Automation.json', 'r', encoding='utf-8') as f:
    vision_data = json.load(f)

for n in vision_data.get('nodes', []):
    if n['name'] == 'FastAPI Gateway':
        # Update body parameters
        params = n['parameters']['bodyParameters']['parameters']
        for p in params:
            if p['name'] == 'sender_email':
                p['value'] = '={{ $json.senderEmail }}'
            elif p['name'] == 'attachment_analysis':
                p['value'] = '={{ $node["Gemini Summary"].json.output }}'
    elif n['name'] == 'Trigger Urgent Fire':
        n['parameters']['url'] = 'http://localhost:5678/webhook/c69bd0d4-a726-4c1c-a9a7-bf7a9337c32a'
    elif n['name'] == 'Gemini Summary':
        n['id'] = '50983aba-ead9-426b-85bf-ed0d3f446dcb'

# Ensure the connection from Has Attachments? goes to Gemini Summary
conns = vision_data.get('connections', {})
if 'Has Attachments?' in conns:
    # Ensure true path (index 0) goes to Gemini Summary
    main_edges = conns['Has Attachments?']['main']
    if len(main_edges) > 0:
        main_edges[0] = [{'node': 'Gemini Summary', 'type': 'main', 'index': 0}]
    if len(main_edges) > 1:
        main_edges[1] = [{'node': 'FastAPI Gateway', 'type': 'main', 'index': 0}]

with open('n8n/Vision Main Automation.json', 'w', encoding='utf-8') as f:
    json.dump(vision_data, f, indent=2)

# Fix 2: Migration Workflow.json
with open('n8n/Migration Workflow.json', 'r', encoding='utf-8') as f:
    migration_data = json.load(f)

for n in migration_data.get('nodes', []):
    # Just to be safe, enforce standard credentials format
    if 'gmail' in n.get('type', '').lower():
        n['credentials'] = {
            "gmailOAuth2": {
                "id": "1", # Standardizing ID for user
                "name": "Gmail account"
            }
        }
    elif 'postgres' in n.get('type', '').lower():
        n['credentials'] = {
            "postgres": {
                "id": "1", 
                "name": "Shared Postgres"
            }
        }

with open('n8n/Migration Workflow.json', 'w', encoding='utf-8') as f:
    json.dump(migration_data, f, indent=2)

print("Bug Fix Script Executed Successfully.")
