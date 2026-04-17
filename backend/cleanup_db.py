import psycopg2

def cleanup():
    try:
        conn = psycopg2.connect("postgresql://user:password@localhost:5432/email_intelligence")
        cur = conn.cursor()
        
        # Delete dependent rows first
        cur.execute("DELETE FROM draft_replies WHERE email_action_id IN (SELECT id FROM email_actions WHERE scheduling_status = 'Confirmed')")
        
        # Delete the confirmed actions
        cur.execute("DELETE FROM email_actions WHERE scheduling_status = 'Confirmed'")
        
        conn.commit()
        print(f"Cleared {cur.rowcount} corrupted meetings completely.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Cleanup failed: {e}")

if __name__ == "__main__":
    cleanup()
