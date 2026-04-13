import os
import psycopg2
import redis
import requests
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def test_db():
    print("--- Testing PostgreSQL ---")
    db_url = os.getenv("DATABASE_URL")
    try:
        conn = psycopg2.connect(db_url)
        conn.close()
        print("DATABASE Connection: SUCCESS")
        return True
    except Exception as e:
        print(f"DATABASE Connection: RED (Error: {e})")
        return False

def test_redis():
    print("\n--- Testing Redis ---")
    redis_url = os.getenv("REDIS_URL")
    try:
        r = redis.from_url(redis_url)
        r.ping()
        print("REDIS Connection: SUCCESS")
        return True
    except Exception as e:
        print(f"REDIS Connection: RED (Error: {e})")
        return False

def test_n8n():
    print("\n--- Testing n8n Webhook Reachability ---")
    # Using the general webhook as a probe
    n8n_url = os.getenv("N8N_WEBHOOK_URL", "http://127.0.0.1:5678/webhook/general")
    try:
        response = requests.get(n8n_url, timeout=5)
        print(f"n8n Reachability: SUCCESS (Status: {response.status_code})")
        return True
    except Exception as e:
        print(f"n8n Reachability: RED (Error: {e})")
        return False

def test_gemini():
    print("\n--- Testing Gemini Intelligence Readiness ---")
    api_key = os.getenv("GEMINI_API_KEY")
    try:
        genai.configure(api_key=api_key)
        # Using the stabilized latest alias
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content("Ping")
        if response.text:
            print("Intelligence Sync: SUCCESS")
            return True
        else:
            print("Intelligence Sync: RED (Empty Response)")
            return False
    except Exception as e:
        print(f"Intelligence Sync: RED (Error: {str(e)[:250]})")
        return False

if __name__ == "__main__":
    db = test_db()
    rd = test_redis()
    n8 = test_n8n()
    gm = test_gemini()
    
    print("\n" + "="*30)
    print("SYSTEM HEALTH REPORT")
    print(f"DB: {'GREEN' if db else 'RED'}")
    print(f"REDIS: {'GREEN' if rd else 'RED'}")
    print(f"N8N: {'GREEN' if n8 else 'RED'}")
    print(f"GEMINI: {'GREEN' if gm else 'RED'}")
    print("="*30)
