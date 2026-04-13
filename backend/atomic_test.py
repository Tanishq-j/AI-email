import os
import google.generativeai as genai
from dotenv import load_dotenv
import time

load_dotenv()

def atomic_test():
    print("--- INITIATING SINGLE ATOMIC PROBE ---")
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Configure with the key
    genai.configure(api_key=api_key)
    
    # We explicitly target the 1.5 model to bypass 2.0 quota limits
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    print("Waiting 5 seconds to ensure no concurrent requests are active...")
    time.sleep(5)
    
    try:
        print("Sending single 'Ping' to Gemini 2.0 Flash...")
        response = model.generate_content("Ping")
        print(f"RESPONSE RECEIVED: {response.text}")
        print("RESULT: SUCCESS")
    except Exception as e:
        print(f"RESULT: FAILED")
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    atomic_test()
