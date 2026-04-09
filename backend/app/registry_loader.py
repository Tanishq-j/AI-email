import pandas as pd
import os

def load_user_registry():
    """
    Reads the user_registry.csv and prepares it for the Identity Agent.
    """
    # Define file path
    base_dir = os.path.dirname(os.path.dirname(__file__))
    csv_path = os.path.join(base_dir, "data", "user_registry.csv")
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Registry not found at {csv_path}")
    
    df = pd.read_csv(csv_path)
    
    # Optional preprocessing depending on agent requirements:
    # E.g., filling NaNs, standardizing emails
    df = df.fillna("")
    
    return df

if __name__ == "__main__":
    try:
        registry = load_user_registry()
        print("Successfully loaded registry:")
        print(registry.head())
    except Exception as e:
        print(f"Failed to load registry: {e}")
