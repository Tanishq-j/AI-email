import psycopg2
import sys

DATABASE_URL = "postgresql://user:password@localhost:5432/email_intelligence"

def clear_data():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("--- SoMailer Database Cleanup ---")
        
        # Tables to clear in order (to respect foreign keys)
        # TRUNCATE CASCADE will handle references automatically
        tables = ["draft_replies", "email_actions", "tasks"]
        
        for table in tables:
            print(f"Clearing table: {table}...")
            # CASCADE ensures that if any other tables refer to these, those rows are cleared too
            # RESTART IDENTITY resets the SERIAL counter to 1
            cur.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;")
        
        conn.commit()
        print("\nSuccess: All testing emails and related actions have been cleared.")
        print("Database is now ready for real teammate testing (IDs reset to 1).")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error during cleanup: {e}")
        sys.exit(1)

if __name__ == "__main__":
    clear_data()
