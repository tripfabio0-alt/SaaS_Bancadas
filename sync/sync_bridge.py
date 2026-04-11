import pyodbc
import pandas as pd
import os
import json
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv
import time

# Carregar variáveis de ambiente
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: SUPABASE_URL ou SUPABASE_KEY não configurados!")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def map_columns(df, is_full_data=False):
    """Mapeia colunas do Access para o padrão do Supabase de forma flexível."""
    
    # Mapeamento de variações de nomes
    mapping = {
        'ID Mark': ['ID Mark', 'ID_Mark', 'IDMark', 'id mark', 'id_mark', 'Mark', 'NO', 'ID'],
        'Meter Number': ['Meter Number', 'Meter_Number', 'MeterNumber', 'meter number', 'Medidor', 'Serial'],
        'Error conclusion': ['Error conclusion', 'Error_conclusion', 'ErrorConclusion', 'error conclusion', 'Conclusão', 'Resultado'],
        'Save time': ['Save time', 'Save_time', 'SaveTime', 'save time', 'Data', 'Hora', 'Timestamp']
    }
    
    final_mapping = {}
    cols_lower = {col.lower().replace('_', ' ').replace('  ', ' '): col for col in df.columns}
    
    for target, variations in mapping.items():
        # Se for Full Data, só nos interessa o ID Mark para o vínculo
        if is_full_data and target != 'ID Mark':
            continue
            
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
    
    if is_full_data:
        # Para Full Data, se achamos o ID Mark, o resto vai para JSON
        if 'ID Mark' in df.columns:
            # Manter apenas ID Mark e criar raw_payload com o resto
            other_cols = [c for c in df.columns if c != 'ID Mark']
            df['raw_payload'] = df[other_cols].apply(lambda x: x.to_json(), axis=1)
            return df[['ID Mark', 'raw_payload']]
        return None # Falha se não achar o ID Mark no full data
    else:
        # Para Data normal, garantir as 4 colunas
        required = ['ID Mark', 'Meter Number', 'Error conclusion', 'Save time']
        for col in required:
            if col not in df.columns:
                df[col] = None
        return df[required]

def sync_file(db_path, bancada_id):
    if not os.path.exists(db_path):
        return

    is_full_data_file = "Full Data" in db_path
    target_supabase_table = "full_data" if is_full_data_file else "data"
    
    conn_str = r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_path + ';'
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        tables = [t.table_name for t in cursor.tables(tableType='TABLE') if not t.table_name.startswith('MSys')]
        
        for table_name in tables:
            try:
                query = f"SELECT * FROM [{table_name}]"
                df = pd.read_sql(query, conn)
                if df.empty: continue

                # --- TRATAMENTO ---
                df = map_columns(df, is_full_data=is_full_data_file)
                if df is None or 'ID Mark' not in df.columns: continue

                # Limpeza e Metadados
                df = df.where(pd.notnull(df), None)
                df['bancada_id'] = bancada_id
                df['sync_at'] = datetime.now().isoformat()
                df = df[df['ID Mark'].notnull()]
                
                if df.empty: continue
                
                records = df.to_dict('records')
                print(f"   [Bancada {bancada_id}] Sincronizando {len(records)} registros da {table_name} -> {target_supabase_table}...")
                supabase.table(target_supabase_table).upsert(records, on_conflict='ID Mark').execute()
                
            except Exception as table_err:
                pass # Erros silenciosos para não travar o loop de tabelas

        conn.close()
    except Exception as e:
        print(f"   [!] Erro no arquivo {os.path.basename(db_path)}: {e}")

def main():
    print("==================================================")
    print("Bancadas Sync Bridge (Versão Full Data JSON) Iniciada")
    print("==================================================")
    
    bancadas = {
        1: os.getenv("BD1_PATH", r"C:\Users\User\Documents\BD\database1\Data.accdb"),
        2: os.getenv("BD2_PATH", r"C:\Users\User\Documents\BD\database2\Data.accdb"),
        3: os.getenv("BD3_PATH", r"C:\Users\User\Documents\BD\database3\Data.accdb"),
        4: os.getenv("BD4_PATH", r"C:\Users\User\Documents\BD\database4\Data.accdb"),
        5: os.getenv("BD5_PATH", r"C:\Users\User\Documents\BD\database5\Data.accdb")
    }

    while True:
        for b_id, path in bancadas.items():
            print(f"Processando Bancada {b_id}...")
            sync_file(path, b_id)
            full_data_path = path.replace("Data.accdb", "Full Data.accdb")
            if os.path.exists(full_data_path):
                sync_file(full_data_path, b_id)

        print("\nPróximo ciclo em 5 minutos...")
        time.sleep(300)

if __name__ == "__main__":
    main()
