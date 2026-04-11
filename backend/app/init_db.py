import os
import psycopg2
from psycopg2 import OperationalError

# Assuming user:password@localhost:5432/email_intelligence based on docker-compose.yml
# The prompt mentioned: (Host: db, DB: postgres, User: postgres, Pass: password) for n8n,
# but our local exposure was 5432 to localhost. Let's use the local mapping.
# The user's docker-compose has POSTGRES_USER: user, POSTGRES_PASSWORD: password, POSTGRES_DB: email_intelligence
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/email_intelligence")

# Fallback to postgres/password/postgres if email_intelligence is missing or the user restarted container differently.
FALLBACK_URL = "postgresql://postgres:password@localhost:5432/postgres"

def create_tables(db_url):
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Tasks table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY, 
            summary TEXT, 
            sender TEXT, 
            due_date TIMESTAMP, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # Email Actions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS email_actions (
            id SERIAL PRIMARY KEY, 
            payload JSONB, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        print(f"Successfully created tables in {db_url}")
        cursor.close()
        conn.close()
        return True
    except OperationalError as e:
        print(f"Failed connecting to {db_url}: {e}")
        return False

if __name__ == "__main__":
    success = create_tables(DATABASE_URL)
    if not success:
        print("Attempting with fallback credentials...")
        create_tables(FALLBACK_URL)
