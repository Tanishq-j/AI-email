import psycopg2

def repair():
    try:
        conn = psycopg2.connect("postgresql://user:password@localhost:5432/email_intelligence")
        cur = conn.cursor()
        
        # Repair the cards to show exactly 10:00 AM IST on the frontend.
        # Frontend logic expects a timestamp that translates to 10:00 AM IST when a Z is appended.
        # Since 10:00 AM IST = 04:30 AM UTC, we must store '2026-04-18 04:30:00'
        cur.execute("""
            UPDATE email_actions 
            SET scheduled_time = '2026-04-18 04:30:00' 
            WHERE scheduling_status = 'Confirmed'
        """)
        
        conn.commit()
        print(f"Repaired {cur.rowcount} cards")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Repair failed: {e}")

if __name__ == "__main__":
    repair()
