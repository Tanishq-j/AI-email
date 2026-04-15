import os
import requests
from dotenv import load_dotenv
import time
import json

load_dotenv()

def atomic_test():
    print("--- INITIATING SINGLE ATOMIC PROBE ---")
    groq_api_key = os.getenv("GROQ_API_KEY")
    
    # Configure with the key
    if not groq_api_key:
        print("RESULT: FAILED")
        print("ERROR: GROQ_API_KEY not set")
        return
    
    print("Waiting 5 seconds to ensure no concurrent requests are active...")
    time.sleep(5)
    
    try:
        print("Sending single 'Ping' to Llama 3.3 70B via Groq...")
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
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
    atomic_test()
