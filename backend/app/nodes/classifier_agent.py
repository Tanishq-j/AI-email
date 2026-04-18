from typing import Dict, Any
import json
import os
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from app.agent_state import GraphState

def process_classification(state: GraphState) -> Dict[str, Any]:
    """Classifier Node: Categorizes email using Llama 3.3 70B via Groq API."""
    email_data = state.get("email_data", {})
    subject = email_data.get("subject", "")
    body = email_data.get("body", "")
    
    groq_api_key = os.environ.get("GROQ_API_KEY", "your_api_key_here")
    
    # Use Llama 3.3 70B for optimal performance
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, groq_api_key=groq_api_key)
    
    user_info = state.get("user_info", {})
    
    prompt = PromptTemplate.from_template(
        """You are a specialized JSON classifier for SoMailer. Output ONLY a single raw JSON object — no prose, no markdown, no code blocks.

STRICT RULES:
1. "category" MUST be exactly ONE of: Urgent_Fire, Scheduling, Action_Required, FYI_Read, Cold_Outreach
2. "urgency_score" is an INTEGER from 0 to 100 (NOT 0-10). Use the scale below.
3. All keys and string values must use DOUBLE QUOTES.

URGENCY SCALE (0-100):
- 0-20: Low/informational (newsletters, FYI, cold outreach, product updates)
- 21-40: Mild (minor action required, non-urgent meeting proposals)
- 41-65: Moderate (action required, scheduling requests from known contacts)
- 66-80: High (time-sensitive action, approaching deadlines)
- 81-95: Critical (production issues, outages, security incidents, immediate response needed)
- 96-100: Catastrophic (complete system failure, data breach, major financial impact)

CATEGORY DETECTION RULES:
- Urgent_Fire: Server down, critical errors, outages, system failures, SLA breach, security incidents, "URGENT" in subject
- Scheduling: Any request to schedule, confirm, reschedule, or cancel a meeting/call/sync — even if embedded in an urgent email. If someone mentions a time, date, or meeting coordination, classify as Scheduling if the PRIMARY ask is meeting coordination.
- Action_Required: Needs a response or task completion but is NOT urgent and NOT scheduling
- FYI_Read: Informational only, no action needed
- Cold_Outreach: Unsolicited sales, marketing, promotional, newsletter, product pitch emails

Email Subject: {subject}
Email Body: {body}
Attachment Analysis: {attachment}
User Context: {user_name} | Goal: {daily_goal} | Preference: {tone}

Output ONLY this JSON (fill in the values):
{{"category": "CATEGORY_HERE", "urgency_score": INTEGER_0_TO_100, "short_summary": "One sentence actionable summary."}}"""
    )
    
    try:
        if groq_api_key == "your_api_key_here":
            raise ValueError("GROQ_API_KEY is not configured.")
        
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
        
    # Ensure urgency_score is on the 0-100 scale.
    # If the LLM still returns a value <=10 (old 0-10 scale), multiply by 10 to normalize.
    raw_score = result.get("urgency_score", 10)
    try:
        raw_score = int(float(raw_score))
    except (TypeError, ValueError):
        raw_score = 10
    
    # Heuristic: if score is 0-10 and the category is urgent/action, it's likely on the old 0-10 scale
    if raw_score <= 10:
        urgency_score = raw_score * 10
    else:
        urgency_score = min(raw_score, 100)

    return {
        "category": cat,
        "urgency_score": urgency_score,
        "short_summary": result.get("short_summary", "Email received.")
    }
