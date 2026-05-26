import sys
import time
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def wait_for_db():
    database_url = os.getenv("DATABASE_URL")
    print(f"Waiting for database at {database_url}...")
    
    # Simple retry loop
    retries = 10
    while retries > 0:
        try:
            conn = psycopg2.connect(database_url)
            conn.close()
            print("Database is ready!")
            return True
        except Exception as e:
            print(f"Database not ready yet... ({e})")
            retries -= 1
            time.sleep(2)
    
    print("Could not connect to database.")
    sys.exit(1)

if __name__ == "__main__":
    wait_for_db()
