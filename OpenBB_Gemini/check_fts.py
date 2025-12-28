import sqlite3
import os

db_file = "test_fts.db"
if os.path.exists(db_file):
    os.remove(db_file)

try:
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    # Attempt to create FTS5 table
    cur.execute("CREATE VIRTUAL TABLE test_index USING fts5(content, tokenize='porter');")
    cur.execute("INSERT INTO test_index(content) VALUES ('This is a test of running code');")
    
    # Test Stemming: 'run' should match 'running'
    cur.execute("SELECT * FROM test_index WHERE test_index MATCH 'run';")
    results = cur.fetchall()
    
    print(f"FTS5 Supported! Found {len(results)} matches for 'run' -> 'running'.")
    conn.close()
except Exception as e:
    print(f"FTS5 Error: {e}")
finally:
    if os.path.exists(db_file):
        os.remove(db_file)
