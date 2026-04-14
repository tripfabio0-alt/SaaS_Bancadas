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
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def map_columns(df, is_full_data=False):
    """Mapeia colunas do Access para o padrão do Supabase de forma flexível e segura."""
    
    mapping = {
        'ID Mark': ['ID Mark', 'ID_Mark', 'IDMark', 'id mark', 'id_mark', 'Mark', 'NO', 'ID', 'No'],
        'Meter Number': ['Meter Number', 'Meter_Number', 'MeterNumber', 'meter number', 'Medidor', 'Serial'],
        'Error conclusion': ['Error conclusion', 'Error_conclusion', 'ErrorConclusion', 'error conclusion', 'Conclusão', 'Resultado'],
        'Save time': ['Save time', 'Save_time', 'SaveTime', 'save time', 'Data', 'Hora', 'Timestamp']
    }
    
    final_mapping = {}
    # Normalização de nomes de colunas (lowercase, trim, remove underscores)
    cols_map = {col.lower().strip().replace('_', ' ').replace('  ', ' '): col for col in df.columns}
    
    for target, variations in mapping.items():
        # Para Full Data, só precisamos do ID Mark como chave de mapeamento se for usar como PK
        if is_full_data and target != 'ID Mark':
            continue
            
        found = False
        target_norm = target.lower()
        
        if target_norm in cols_map:
            final_mapping[cols_map[target_norm]] = target
            found = True
        
        if not found:
            for variant in variations:
                variant_norm = variant.lower().strip().replace('_', ' ')
                if variant_norm in cols_map:
                    final_mapping[cols_map[variant_norm]] = target
                    found = True
                    break
    
    if final_mapping:
        df = df.rename(columns=final_mapping)
    
    # Garantir que as colunas obrigatórias existam
    if is_full_data:
        required = ['ID Mark']
    else:
        required = ['ID Mark', 'Meter Number', 'Error conclusion', 'Save time']
        
    for col in required:
        if col not in df.columns:
            df[col] = "N/A"

    if is_full_data:
        # Full Data -> JSON Payload (como dicionário para o Supabase tratar como JSONB)
        other_cols = [c for c in df.columns if c != 'ID Mark']
        # Convertemos para dicionário linha por linha
        df['raw_payload'] = df[other_cols].apply(lambda x: x.to_dict(), axis=1)
        # Retornar APENAS o que o Supabase aceita na tabela full_data
        return df[['ID Mark', 'raw_payload']].copy()
    else:
        # Data -> Apenas colunas conhecidas
        return df[required].copy()

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

                df = map_columns(df, is_full_data=is_full_data_file)
                if df is None or 'ID Mark' not in df.columns: continue

                # Limpeza final e adição de metadados
                df = df.where(pd.notnull(df), None)
                df['bancada_id'] = int(bancada_id)
                df['sync_at'] = datetime.now().isoformat()
                
                # Para a tabela 'data', tentamos converter o 'Save time' em 'timestamp'
                if not is_full_data_file and 'Save time' in df.columns:
                    try:
                        df['timestamp'] = pd.to_datetime(df['Save time']).dt.strftime('%Y-%m-%dT%H:%M:%S')
                    except:
                        pass

                df = df[df['ID Mark'].notnull()]
                if df.empty: continue
                
                # Garantir que enviamos APENAS as colunas que existem no Supabase (Filtragem Estrita)
                allowed_columns = ['ID Mark', 'bancada_id', 'sync_at']
                if is_full_data_file:
                    allowed_columns += ['raw_payload']
                else:
                    allowed_columns += ['Meter Number', 'Error conclusion', 'Save time', 'timestamp']
                
                # Filtragem final do DataFrame para remover qualquer coluna extra do Access
                df_final = df[[c for c in allowed_columns if c in df.columns]].copy()
                
                records = df_final.to_dict('records')
                
                # DEBUG: Mostrar colunas do primeiro registro antes de enviar
                if records:
                    print(f"   [Bancada {bancada_id}] Enviando para {target_supabase_table}. Colunas: {list(records[0].keys())}")
                
                # Chunking para evitar erro de payload muito grande
                chunk_size = 300 # Reduzido para maior estabilidade
                total_chunks = (len(records) + chunk_size - 1) // chunk_size
                
                for i in range(0, len(records), chunk_size):
                    chunk = records[i:i + chunk_size]
                    current_chunk_idx = (i // chunk_size) + 1
                    if total_chunks > 1 and current_chunk_idx % 5 == 0: # Logar a cada 5 lotes para não poluir
                        print(f"      - Progresso: {current_chunk_idx}/{total_chunks}...")
                        
                    result = supabase.table(target_supabase_table).upsert(chunk, on_conflict='ID Mark').execute()
                    
                print(f"   [OK] Sincronizado: {target_supabase_table} ({len(records)} registros)")
                
            except Exception as e:
                print(f"   [!] Erro na tabela {table_name}: {e}")
                with open("sync/sync_log.txt", "a") as f:
                    f.write(f"{datetime.now()} - Erro na tabela {table_name}: {e}\n")

        conn.close()
    except Exception as e:
        print(f"   [!] Erro crítico no banco {db_path}: {e}")

def main():
    print("Sincronizador SaaS Bancadas V4 (Estabilizado) Ativo")
    
    bancadas = {
        1: os.getenv("BD1_PATH", r"C:\Users\User\Documents\BD\database1\Data.accdb"),
        2: os.getenv("BD2_PATH", r"C:\Users\User\Documents\BD\database2\Data.accdb"),
        3: os.getenv("BD3_PATH", r"C:\Users\User\Documents\BD\database3\Data.accdb"),
        4: os.getenv("BD4_PATH", r"C:\Users\User\Documents\BD\database4\Data.accdb"),
        5: os.getenv("BD5_PATH", r"C:\Users\User\Documents\BD\database5\Data.accdb")
    }

    while True:
        try:
            for b_id, path in bancadas.items():
                if not path: continue
                
                # Se o path for o Data, tenta sincronizar ele e o Full Data
                # Se o path for o Full Data (como está no .env), tenta os dois também
                data_path = path.replace("Full Data.accdb", "Data.accdb")
                full_path = path.replace("Data.accdb", "Full Data.accdb")
                
                if os.path.exists(data_path):
                    print(f"--- Sincronizando Bancada {b_id} (Data) ---")
                    sync_file(data_path, b_id)
                
                if os.path.exists(full_path):
                    print(f"--- Sincronizando Bancada {b_id} (Full Data) ---")
                    sync_file(full_path, b_id)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Erro no loop principal: {e}")
        
        time.sleep(300)

if __name__ == "__main__":
    main()
