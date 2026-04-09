from typing import Dict, Any
import json
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from app.agent_state import GraphState

def process_classification(state: GraphState) -> Dict[str, Any]:
    """Classifier Node: Categorizes email using Gemini API."""
    email_data = state.get("email_data", {})
    subject = email_data.get("subject", "")
    body = email_data.get("body", "")
    
    api_key = os.environ.get("GEMINI_API_KEY", "your_api_key_here")
    
    # Use Gemini model specifying output instruction
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0, google_api_key=api_key)
    
    prompt = PromptTemplate.from_template(
        """Analyze the following email and output a strictly valid JSON object with the following keys:
- "category": must be EXACTLY ONE of [Urgent_Fire, Scheduling, Action_Required, FYI_Read, Cold_Outreach]
- "urgency_score": integer from 1 to 10
- "short_summary": a 1-sentence summary of the email

Email Subject: {subject}
Email Body: {body}

Output JSON Format {{"category": "...", "urgency_score": ..., "short_summary": "..."}} without markdown formatting:"""
    )
    
    try:
        if api_key == "your_api_key_here":
            raise ValueError("Mock fallback due to unset API Key")
        chain = prompt | llm
        response = chain.invoke({"subject": subject, "body": body})
        text = response.content.strip()
    except Exception as e:
        print(f"Skipping LLM call: {e}")
        text = '{"category": "Urgent_Fire", "urgency_score": 10, "short_summary": "[MOCKED] Server failure."}'
    # Strip markdown if LLM outputs markdown block
    if text.startswith("```json"):
        text = text[7:-3]
    elif text.startswith("```"):
        text = text[3:-3]
    text = text.strip()
    
    try:
        result = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"Failed to parse LLM Response: {text}")
        result = {
            "category": "FYI_Read",
            "urgency_score": 1,
            "short_summary": "Failed to parse categorization."
        }
        
    return {
        "category": result.get("category", "FYI_Read"),
        "urgency_score": result.get("urgency_score", 1),
        "short_summary": result.get("short_summary", "")
    }
