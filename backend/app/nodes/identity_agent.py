from typing import Dict, Any
from app.registry_loader import load_user_registry
from app.agent_state import GraphState

def process_identity(state: GraphState) -> Dict[str, Any]:
    """Identity Node: Matches sender against user registry to determine classification."""
    email_data = state.get("email_data", {})
    sender = email_data.get("sender", "")
    receiver = email_data.get("receiver", "")

    try:
        registry_df = load_user_registry()
    except Exception as e:
        registry_df = None
    
    classification = "Team"
    user_info = {}
    
    if registry_df is not None and not registry_df.empty:
        # Find receiver in registry
        user_row = registry_df[registry_df["corporate_email"] == receiver]
        if not user_row.empty:
            user_info = user_row.iloc[0].to_dict()
            manager_email = user_info.get("manager_email", "")
            # If the sender is their manager or it's flagged as 1-on-1
            if sender == manager_email or email_data.get("is_1on1", False):
                classification = "Individual"
                
    # Basic fallback heuristic if not matching registry explicitly
    elif email_data.get("is_1on1", False):
        classification = "Individual"

    return {"classification": classification, "user_info": user_info}
