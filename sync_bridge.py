import os
import pyodbc
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
import time
import sys

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Database configuration
BANCADAS = [
    {"id": 1, "path": os.getenv("BD1_PATH")},
    {"id": 2, "path": os.getenv("BD2_PATH")},
    {"id": 3, "path": os.getenv("BD3_PATH")},
    {"id": 4, "path": os.getenv("BD4_PATH")},
    {"id": 5, "path": os.getenv("BD5_PATH")},
]

TABLES_TO_SYNC = ["Data", "Full Data"]

def get_access_connection(db_path):
    if not os.path.exists(db_path):
        print(f"File not found: {db_path}")
        return None
    
    conn_str = (
        r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
        r'DBQ=' + db_path + ';'
    )
    try:
        return pyodbc.connect(conn_str)
    except Exception as e:
        print(f"Error connecting to {db_path}: {e}")
        return None

def sync_table(bancada_id, table_name, conn):
    try:
        query = f"SELECT * FROM [{table_name}]"
        df = pd.read_sql(query, conn)
        
        # Add metadata
        df['bancada_id'] = bancada_id
        df['sync_at'] = pd.Timestamp.now().isoformat()
        
        # Convert to list of dicts
        records = df.to_dict('records')
        
        if not records:
            print(f"No records found in {table_name} for Bancada {bancada_id}")
            return

        # Target table name in Supabase (lowercase and underscored)
        target_table = table_name.lower().replace(" ", "_")
        
        # Upsert logic (requires a unique constraint in Supabase, e.g., on 'id' or composite)
        # For simplicity, we'll try to insert. In a real scenario, use upsert.
        # supabase.table(target_table).upsert(records).execute()
        
        # Note: We append the bancada_id to distinguish data
        print(f"Syncing {len(records)} records from {table_name} (Bancada {bancada_id})...")
        
        # For this version, we will clear and re-insert or just insert new ones
        # Real production would use a more robust sync logic
        response = supabase.table(target_table).upsert(records, on_conflict='ID Mark').execute()
        print(f"Success: {table_name} synced.")

    except Exception as e:
        print(f"Error syncing {table_name} for Bancada {bancada_id}: {e}")

def main():
    print("Starting SaaS Bancadas Sync Bridge...")
    
    while True:
        for bancada in BANCADAS:
            path = bancada["path"]
            if not path:
                continue
                
            print(f"\nChecking Bancada {bancada['id']} at {path}...")
            conn = get_access_connection(path)
            
            if conn:
                for table in TABLES_TO_SYNC:
                    sync_table(bancada["id"], table, conn)
                conn.close()
            
        print("\nSync cycle complete. Waiting 5 minutes...")
        time.sleep(300) # Sync every 5 minutes

if __name__ == "__main__":
    main()
