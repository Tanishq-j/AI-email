import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def list_and_test():
    print("--- INITIATING DISCOVERY PROBE ---")
    api_key = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    
    try:
        print("Listing Available Models for this Key...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"AVAILABLE: {m.name}")
        
        # Select gemini-flash-latest
        model_to_test = 'models/gemini-flash-latest'
        print(f"\nTesting with {model_to_test}...")
        model = genai.GenerativeModel(model_to_test)
        response = model.generate_content("Ping")
        print(f"RESPONSE RECEIVED: {response.text}")
        print("RESULT: SUCCESS")
    except Exception as e:
        print(f"RESULT: FAILED")
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    list_and_test()
