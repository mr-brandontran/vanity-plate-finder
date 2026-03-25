import sqlite3
from datetime import datetime

# This creates a local file to act as our database
DB_FILE = "plates_cache.db"

def setup_database():
    """Creates the table if it doesn't exist yet."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS plates (
            plate_str TEXT PRIMARY KEY,
            status TEXT,
            last_checked TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("Database ready.")

def get_cached_status(plate_str):
    """Checks if we already know the status of this plate."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM plates WHERE plate_str = ?", (plate_str,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return result[0] # Returns 'AVAILABLE' or 'TAKEN'
    return None

def save_plate_status(plate_str, status):
    """Saves or updates the plate's status in the database."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # REPLACE INTO acts like an UPSERT. It inserts, or updates if it already exists.
    cursor.execute('''
        REPLACE INTO plates (plate_str, status, last_checked)
        VALUES (?, ?, ?)
    ''', (plate_str, status, now))
    
    conn.commit()
    conn.close()

# Run this once to create the file when the script is tested
if __name__ == "__main__":
    setup_database()