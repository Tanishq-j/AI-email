import json
import uuid

def save_json(name, data):
    with open('n8n/' + name, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def generate_id():
    return str(uuid.uuid4())

# Task 3: Migration Workflow
migration_workflow = {
  "name": "Migration Workflow",
  "nodes": [
    {
      "parameters": {},
      "id": generate_id(),
      "name": "When clicking \"Test Workflow\"",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [ 0, 0 ]
    },
    {
      "parameters": {
        "operation": "getAll",
        "limit": 50,
        "filters": {
          "q": "is:inbox"
        }
      },
      "id": generate_id(),
      "name": "Gmail",
      "type": "n8n-nodes-base.gmail",
      "typeVersion": 2.1,
      "position": [ 200, 0 ],
      "credentials": {
        "gmailOAuth2": {
          "id": "gmail-cred",
          "name": "Gmail account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": """
// Clean headers to get simple sender, subject, content
const items = $input.all();
return items.map(item => {
    let raw = item.json;
    return {
        json: {
            sender_email: raw.from || raw.sender || 'unknown@example.com',
            subject: raw.subject || 'No Subject',
            content: raw.snippet || raw.textAsHtml || raw.textPlain || ''
        }
    }
});
"""
      },
      "id": generate_id(),
      "name": "Clean Data",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [ 400, 0 ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://localhost:8000/process-email",
        "sendBody": True,
        "bodyParameters": {
          "parameters": [
            { "name": "sender_email", "value": "={{$json.sender_email}}" },
            { "name": "subject", "value": "={{$json.subject}}" },
            { "name": "content", "value": "={{$json.content}}" }
          ]
        }
      },
      "id": generate_id(),
      "name": "FastAPI Gateway",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [ 600, 0 ]
    }
  ],
  "connections": {
    "When clicking \"Test Workflow\"": {
      "main": [ [ { "node": "Gmail", "type": "main", "index": 0 } ] ]
    },
    "Gmail": {
      "main": [ [ { "node": "Clean Data", "type": "main", "index": 0 } ] ]
    },
    "Clean Data": {
      "main": [ [ { "node": "FastAPI Gateway", "type": "main", "index": 0 } ] ]
    }
  }
}

save_json('Migration Workflow.json', migration_workflow)


# Task 1 & 2: Modify Main Automation
with open('n8n/Cleaned Main Automation.json', 'r', encoding='utf-8') as f:
    main_data = json.load(f)

nodes = main_data['nodes']
conns = {}

gmail_node = next(n for n in nodes if 'gmailTrigger' in n['type'])
code_node = next(n for n in nodes if 'code' in n['type'])
fastapi_node = next(n for n in nodes if 'httpRequest' in n['type'])

# 1. Update Gmail to download attachments
if 'parameters' not in gmail_node: gmail_node['parameters'] = {}
gmail_node['parameters']['downloadAttachments'] = True

# 2. Add Switch Node
switch_node = {
    "parameters": {
        "dataType": "string",
        "value1": "={{$json.sender || $json.from}}",
        "rules": {
            "rules": [
                {
                    "operation": "contains",
                    "value2": "priority@example.com",
                    "output": 0
                },
                {
                    "operation": "contains",
                    "value2": "blacklist@example.com",
                    "output": 1
                }
            ]
        },
        "fallbackOutput": 2
    },
    "id": generate_id(),
    "name": "Intelligent Filter",
    "type": "n8n-nodes-base.switch",
    "typeVersion": 2,
    "position": [300, 300]
}

# 3. Add Urgent Fire webhook caller
urgent_fire_node = {
    "parameters": {
        "method": "POST",
        "url": "http://localhost:5678/webhook/urgent-fire", # Internal trigger to Post Urgent_Fire
        "sendBody": True,
        "bodyParameters": {
            "parameters": [
                {"name": "rawPayload", "value": "={{JSON.stringify($json)}}"}
            ]
        }
    },
    "id": generate_id(),
    "name": "Trigger Urgent Fire",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4,
    "position": [500, 100]
}

# 4. Add Blacklist Postgres 
blacklist_node = {
    "parameters": {
        "operation": "insert",
        "schema": "public",
        "table": "email_actions",
        "columns": "payload"
    },
    "id": generate_id(),
    "name": "Save Blacklist",
    "type": "n8n-nodes-base.postgres",
    "typeVersion": 2.4,
    "position": [500, 300],
    "credentials": {"postgres": {"id": "1", "name": "Shared Postgres"}}
}

# 5. Attachment Detection (IF node)
attachment_if_node = {
    "parameters": {
        "conditions": {
            "boolean": [
                {
                    "value1": "={{$binary != undefined && Object.keys($binary).length > 0}}",
                    "value2": True
                }
            ]
        }
    },
    "id": generate_id(),
    "name": "Has Attachments?",
    "type": "n8n-nodes-base.if",
    "typeVersion": 1,
    "position": [700, 500]
}

# 6. Gemini Summary node for attachments
gemini_node = {
    "parameters": {
        "model": "gemini-1.5-flash",
        "prompt": "Summarize the content of the attached document.",
        # Abstract interaction assuming n8n google gemini setup supports binary ingestion
        "binaryPropertyName": "attachment_0" 
    },
    "id": generate_id(),
    "name": "Vision Upgrade",
    "type": "@n8n/n8n-nodes-langchain.googleGemini" if False else "n8n-nodes-base.googleGemini", 
    # Use standard n8n node if we don't know the exact langchain version. The user mentions "Gemini 1.5 Flash node"
    "typeVersion": 1,
    "position": [900, 400]
}

# Update FastAPI Node
fastapi_node['parameters']['bodyParameters']['parameters'].append({
    "name": "attachment_analysis",
    "value": "={{ $json.attachment_analysis || '' }}"
})


# Replace nodes in list
nodes = [gmail_node, switch_node, urgent_fire_node, blacklist_node, code_node, attachment_if_node, gemini_node, fastapi_node]

# Rewire connections
conns[gmail_node['name']] = {"main": [[{"node": switch_node['name'], "type": "main", "index": 0}]]}
conns[switch_node['name']] = {
    "main": [
        [{"node": urgent_fire_node['name'], "type": "main", "index": 0}], # output 0
        [{"node": blacklist_node['name'], "type": "main", "index": 0}], # output 1
        [{"node": code_node['name'], "type": "main", "index": 0}] # output 2
    ]
}

conns[code_node['name']] = {"main": [[{"node": attachment_if_node['name'], "type": "main", "index": 0}]]}

conns[attachment_if_node['name']] = {
    "main": [
        [{"node": gemini_node['name'], "type": "main", "index": 0}], # True
        [{"node": fastapi_node['name'], "type": "main", "index": 0}] # False
    ]
}

gemini_node['name'] = 'Gemini Summary'
conns[gemini_node['name']] = {"main": [[{"node": fastapi_node['name'], "type": "main", "index": 0}]]}

main_data['nodes'] = nodes
main_data['connections'] = conns
save_json('Vision Main Automation.json', main_data)

print("Generated Migration Workflow.json and Vision Main Automation.json")
