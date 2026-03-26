import sqlite3

DB_FILE = "plates_cache.db"

def init_db():
    """Creates the database and table if they don't exist yet."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS plates (
            plate_str TEXT PRIMARY KEY,
            status TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Run this instantly whenever the app starts
init_db()

def get_cached_status(plate_str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM plates WHERE plate_str = ?", (plate_str,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return result[0]
    return None

def save_plate_status(plate_str, status):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO plates (plate_str, status) 
        VALUES (?, ?)
    ''', (plate_str, status))
    conn.commit()
    conn.close()