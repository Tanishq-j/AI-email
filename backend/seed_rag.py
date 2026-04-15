import psycopg2
import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()

# We use the highly efficient CPU-friendly 384d model
model = SentenceTransformer('all-MiniLM-L6-v2')

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/email_intelligence")

KNOWLEDGE = [
    "CONSTRAINT 1: Never schedule 1-on-1 meetings on Mondays. Block out Tuesday afternoons for team syncing. Instead, push external meetings to Wednesday or Thursday.",
    "CONSTRAINT 2: Project Alpha guidelines - No new backend servers to be spun up without director approval due to budget freezes.",
    "CONSTRAINT 3: Database Escalation rules - If DB_ERR_001 is triggered, DevOps on-call lead (Tanishq) must be immediately paged. Payment failures must be escalated via Slack.",
    "CONSTRAINT 4: Client Tone Policy - Always respond to enterprise clients (like starkindustries.com) with highly professional, non-casual language. Exclude pleasantries from internal memos."
]

def seed_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cursor.execute("DROP TABLE IF EXISTS knowledge_base;")
        cursor.execute("""
            CREATE TABLE knowledge_base (
                id SERIAL PRIMARY KEY,
                content TEXT,
                embedding vector(384)
            );
        """)
        
        print("Vector Table (knowledge_base) reset.")
        
        for text in KNOWLEDGE:
            print(f"Embedding chunk: {text[:60]}...")
            emb = model.encode(text).tolist()
            cursor.execute(
                "INSERT INTO knowledge_base (content, embedding) VALUES (%s, %s);",
                (text, str(emb))
            )
            
        print("RAG Seed Vector DB Initialized Successfully!")
    except Exception as e:
        print(f"Error seeding Vector DB: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_db()
