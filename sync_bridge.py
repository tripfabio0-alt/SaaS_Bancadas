# SaaS Bancadas Sync Bridge - Dynamic Sincronização
# Script para monitorar bancos de dados Microsoft Access e sincronizar com Supabase

import os
import pyodbc
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
import time
import sys
from datetime import datetime

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Monitoramento de 5 Bancadas
# Cada bancada possui dois arquivos principais: Data.accdb e Full Data.accdb
BANCADAS = []
root_path = r"C:\Users\User\Documents\BD"
for i in range(1, 6):
    bench_dir = os.path.join(root_path, f"database{i}")
    BANCADAS.append({
        "id": i,
        "files": {
            "data": os.path.join(bench_dir, "Data.accdb"),
            "full_data": os.path.join(bench_dir, "Full Data.accdb")
        }
    })

def get_access_connection(db_path):
    if not os.path.exists(db_path):
        return None
    
    conn_str = (
        r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
        r'DBQ=' + db_path + ';'
    )
    try:
        return pyodbc.connect(conn_str)
    except Exception as e:
        print(f"Error connecting to {os.path.basename(db_path)}: {e}")
        return None

def get_table_names(conn):
    """Retorna todos os nomes de tabelas que não são do sistema (MSys)"""
    cursor = conn.cursor()
    tables = [t.table_name for t in cursor.tables(tableType='TABLE') if not t.table_name.startswith('MSys')]
    return tables

def sync_file(bancada_id, target_supabase_table, db_path):
    conn = get_access_connection(db_path)
    if not conn:
        return

    try:
        tables = get_table_names(conn)
        if not tables:
            print(f"   [Bancada {bancada_id}] Nenhum dado encontrado em {os.path.basename(db_path)}")
            return

        for table_name in tables:
            try:
                # Ler a tabela do Access
                query = f"SELECT * FROM [{table_name}]"
                df = pd.read_sql(query, conn)
                
                if df.empty:
                    continue

                # Adicionar metadados
                df['bancada_id'] = bancada_id
                df['sync_at'] = datetime.now().isoformat()
                
                # Converter para lista de dicionários
                records = df.to_dict('records')
                
                # Upsert no Supabase
                # Usamos 'ID Mark' como chave única para evitar duplicados
                print(f"   [Bancada {bancada_id}] Sincronizando {len(records)} registros da tabela {table_name} -> {target_supabase_table}...")
                supabase.table(target_supabase_table).upsert(records, on_conflict='ID Mark').execute()
                
            except Exception as table_err:
                print(f"   [!] Erro na tabela {table_name}: {table_err}")

    except Exception as e:
        print(f"   [!] Erro ao processar arquivo {os.path.basename(db_path)}: {e}")
    finally:
        conn.close()

def main():
    print(f"{'='*50}")
    print(f"Bancadas Sync Bridge Iniciada em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"{'='*50}")
    
    while True:
        for bancada in BANCADAS:
            print(f"\n>>> Processando Bancada {bancada['id']}...")
            
            # 1. Sincronizar Arquivo Data.accdb -> tabela 'data' no Supabase
            sync_file(bancada["id"], "data", bancada["files"]["data"])
            
            # 2. Sincronizar Arquivo Full Data.accdb -> tabela 'full_data' no Supabase
            sync_file(bancada["id"], "full_data", bancada["files"]["full_data"])
            
        print(f"\n{'*'*50}")
        print(f"Ciclo de sincronização finalizado. Próximo em 5 minutos.")
        print(f"{'*'*50}")
        time.sleep(300)

if __name__ == "__main__":
    main()
