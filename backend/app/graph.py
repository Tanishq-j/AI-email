from langgraph.graph import StateGraph, START, END
from app.agent_state import GraphState
from app.nodes.identity_agent import process_identity
from app.nodes.classifier_agent import process_classification
from app.nodes.researcher_agent import process_research
from app.nodes.planner_agent import process_planner

def should_research(state: GraphState) -> str:
    """Conditional Edge: Skip research for FYI_Read and Cold_Outreach."""
    category = state.get("category", "")
    if category in ["FYI_Read", "Cold_Outreach"]:
        return "planner_node"
    return "researcher_node"

# Define the graph
builder = StateGraph(GraphState)

builder.add_node("identity_node", process_identity)
builder.add_node("classification_node", process_classification)
builder.add_node("researcher_node", process_research)
builder.add_node("planner_node", process_planner)

# Define edges
builder.add_edge(START, "identity_node")
builder.add_edge("identity_node", "classification_node")

# Conditional edge from classification
builder.add_conditional_edges("classification_node", should_research)

# Remaining edges
builder.add_edge("researcher_node", "planner_node")
builder.add_edge("planner_node", END)

# Compile graph
graph_app = builder.compile()

# Dummy test execution
if __name__ == "__main__":
    from dotenv import load_dotenv
    import json
    load_dotenv()
    
    print("--- Simulating Email Intake ---")
    dummy_email = {
        "sender": "boss@corporatedomain.com",
        "receiver": "employee@corporatedomain.com",
        "subject": "URGENT: Server Down in Production",
        "body": "The main database server is down. Please look into this immediately, halt your current work, and mitigate the failure.",
        "is_1on1": False
    }
    
    initial_state = GraphState(
        email_data=dummy_email,
        user_info={"working_hours": "08:00-16:00", "priority_projects": "Project Phoenix"},
        classification=None,
        category=None,
        urgency_score=None,
        short_summary=None,
        context=None,
        command_package=None
    )
    
    print("Executing Graph...")
    result = graph_app.invoke(initial_state)
    
    print("\n--- Command Package Generated ---")
    print(json.dumps(result.get('command_package'), indent=2))
