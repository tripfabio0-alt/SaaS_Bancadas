import os
import pyodbc
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Configurações
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
db_path = r"C:\Users\User\Documents\BD\database1\Data.accdb"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def map_columns(df):
    mapping = {
        'ID Mark': ['ID Mark', 'ID_Mark', 'IDMark', 'id mark', 'id_mark', 'Mark'],
        'Meter Number': ['Meter Number', 'Meter_Number', 'MeterNumber', 'meter number', 'Medidor', 'Serial'],
        'Error conclusion': ['Error conclusion', 'Error_conclusion', 'ErrorConclusion', 'error conclusion', 'Conclusão', 'Resultado'],
        'Save time': ['Save time', 'Save_time', 'SaveTime', 'save time', 'Data', 'Hora', 'Timestamp']
    }
    final_mapping = {}
    cols_lower = {col.lower().replace('_', ' ').replace('  ', ' '): col for col in df.columns}
    for target, variations in mapping.items():
        found = False
        target_norm = target.lower()
        if target_norm in cols_lower:
            final_mapping[cols_lower[target_norm]] = target
            found = True
        if not found:
            for variant in variations:
                variant_norm = variant.lower().replace('_', ' ')
                if variant_norm in cols_lower:
                    final_mapping[cols_lower[variant_norm]] = target
                    found = True
                    break
    if final_mapping:
        df = df.rename(columns=final_mapping)
    required = ['ID Mark', 'Meter Number', 'Error conclusion', 'Save time']
    for col in required:
        if col not in df.columns:
            df[col] = None
    return df[required]

def diagnose():
    print(f"Lendo banco: {db_path}")
    conn_str = r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_path + ';'
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    tables = [t.table_name for t in cursor.tables(tableType='TABLE') if not t.table_name.startswith('MSys')]
    
    table_to_test = tables[0]
    print(f"Testando tabela: {table_to_test}")
    
    df = pd.read_sql(f"SELECT TOP 10 * FROM [{table_to_test}]", conn)
    conn.close()
    
    df = map_columns(df)
    df = df.where(pd.notnull(df), None)
    df['bancada_id'] = 1
    
    records = df.to_dict('records')
    
    print(f"\nTentando inserir {len(records)} registros individualmente...")
    
    for i, record in enumerate(records):
        print(f" - Registro {i+1} [ID Mark: {record.get('ID Mark')}]: ", end="")
        try:
            res = supabase.table("data").upsert(record).execute()
            print("SUCESSO")
        except Exception as e:
            print(f"FALHA! -> {e}")

if __name__ == "__main__":
    diagnose()
