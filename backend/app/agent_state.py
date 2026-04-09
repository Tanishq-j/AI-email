from typing import TypedDict, Optional

class GraphState(TypedDict):
    email_data: dict
    user_info: dict
    classification: Optional[str]
    category: Optional[str]
    urgency_score: Optional[int]
    short_summary: Optional[str]
    context: Optional[list]
    command_package: Optional[dict]
