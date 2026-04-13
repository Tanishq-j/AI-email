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
    
    # Use the latest supported model (gemini-flash-latest) for optimal stability
    llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0, google_api_key=api_key)
    
    user_info = state.get("user_info", {})
    
    prompt = PromptTemplate.from_template(
        """You are a specialized JSON generator for SoMailer.
Follow a strict Chain-of-Thought (CoT) reasoning path INTERNALLY, but ONLY output the final JSON.

STRICT OUTPUT RULE:
1. You must NOT include any prose, explanations, or markdown. Output ONLY a single raw JSON object.
2. For "category", you MUST pick EXACTLY ONE from the list. Do NOT include pipes or multiple options.
3. Ensure all keys and string values are enclosed in DOUBLE QUOTES.

Email Subject: {subject}
Email Body: {body}
Attachment Analysis: {attachment}

User Context: {user_name} | Goal: {daily_goal} | Preference: {tone}

Output JSON Template:
{{"category": "Urgent_Fire", "urgency_score": 9, "short_summary": "Summary of the request."}}

Allowed Categories: [Urgent_Fire, Scheduling, Action_Required, FYI_Read, Cold_Outreach]"""
    )
    
    try:
        if api_key == "your_api_key_here":
            raise ValueError("GEMINI_API_KEY is not configured.")
        
        print(f"[Classifier] Invoking LLM for subject: {subject}...")
        chain = prompt | llm
        response = chain.invoke({
            "subject": subject, 
            "body": body, 
            "attachment": email_data.get("attachment_analysis", "None"),
            "user_name": user_info.get("name", "User"),
            "daily_goal": user_info.get("daily_goal", "General email management"),
            "tone": user_info.get("tone_preference", "Professional")
        })
        
        # Handle cases where response.content might be a list or non-string
        if isinstance(response.content, list):
            # Extract text from the first part if it's a list (common in some multi-modal models)
            text_parts = [part.get("text", "") if isinstance(part, dict) else str(part) for part in response.content]
            text = "".join(text_parts).strip()
        else:
            text = str(response.content).strip()
        
        # Robust JSON Extraction: Find the outermost { }
        import re
        # Look for a { that starts a JSON object, specifically avoiding the 'text' key if it was wrapped
        json_match = re.search(r'(\{.*\})', text, re.DOTALL)
        if json_match:
            candidate = json_match.group(1)
            # Check if this is truly the JSON we want (contains 'category')
            if '"category"' in candidate or "'category'" in candidate:
                text = candidate
            
        print(f"[Classifier] Handled Response: {text[:100]}...")
    except Exception as e:
        print(f"[Classifier] LLM Error: {e}")
        return {
            "category": "FYI_Read",
            "urgency_score": 3,
            "short_summary": f"System Alert: AI communication issue ({str(e)[:30]})"
        }
    
    try:
        # Convert single quotes to double quotes if the AI used Python-style dicts
        if "'" in text and '"' not in text:
            import ast
            result = ast.literal_eval(text)
        else:
            result = json.loads(text)
    except Exception as e:
        print(f"Failed to parse LLM Response: {text}")
        result = {
            "category": "FYI_Read",
            "urgency_score": 1,
            "short_summary": f"Intelligence Error: {str(e)[:40]}"
        }
    
    # Normalize category: remove pipes and ensure it's in the allowed list
    cat = str(result.get("category", "FYI_Read")).split('|')[0].strip()
    allowed = ["Urgent_Fire", "Scheduling", "Action_Required", "FYI_Read", "Cold_Outreach"]
    if cat not in allowed:
        # Check if it contains any of the keywords
        matched = False
        for a in allowed:
            if a in cat:
                cat = a
                matched = True
                break
        if not matched: cat = "FYI_Read"
        
    return {
        "category": cat,
        "urgency_score": result.get("urgency_score", 1),
        "short_summary": result.get("short_summary", "Email received.")
    }
