import os
import requests
from dotenv import load_dotenv

load_dotenv()

def list_and_test():
    print("--- INITIATING DISCOVERY PROBE ---")
    groq_api_key = os.getenv("GROQ_API_KEY")
    
    if not groq_api_key:
        print("RESULT: FAILED")
        print("ERROR: GROQ_API_KEY not set")
        return
    
    try:
        print("Testing Groq connection with Llama 3.3 70B...")
        model_to_test = 'llama-3.3-70b-versatile'
        print(f"\nTesting with {model_to_test}...")
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model_to_test,
                "messages": [{"role": "user", "content": "Ping"}],
                "temperature": 0
            },
            timeout=10
        )
        response.raise_for_status()
        result = response.json()
        message = result['choices'][0]['message']['content']
        print(f"RESPONSE RECEIVED: {message}")
        print("RESULT: SUCCESS")
    except Exception as e:
        print(f"RESULT: FAILED")
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    list_and_test()
