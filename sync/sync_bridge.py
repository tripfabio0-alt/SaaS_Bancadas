import pyodbc
import pandas as pd
import os
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv
import time

# Carregar variáveis de ambiente
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERRO] Variáveis SUPABASE_URL e SUPABASE_KEY não encontradas no .env")
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
    cols_map = {col.lower().strip().replace('_', ' ').replace('  ', ' '): col for col in df.columns}
    
    for target, variations in mapping.items():
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
    
    if is_full_data:
        required = ['ID Mark']
    else:
        required = ['ID Mark', 'Meter Number', 'Error conclusion', 'Save time']
        
    for col in required:
        if col not in df.columns:
            df[col] = "N/A"

    if is_full_data:
        other_cols = [c for c in df.columns if c != 'ID Mark']
        df['raw_payload'] = df[other_cols].apply(lambda x: x.to_dict(), axis=1)
        return df[['ID Mark', 'raw_payload']].copy()
    else:
        return df[required].copy()

STATE_FILE = os.path.join(os.path.dirname(__file__), "sync_state.json")

def load_state() -> dict:
    """Carrega o estado de última sincronização (para sync incremental)."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_state(state: dict):
    """Salva o estado de última sincronização."""
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)

def sync_file(db_path, bancada_id):
    if not os.path.exists(db_path):
        print(f"   [!] Arquivo não encontrado: {db_path}")
        return

    is_full_data_file = "Full Data" in db_path
    target_supabase_table = "full_data" if is_full_data_file else "data"
    state_key = f"{bancada_id}_{'full' if is_full_data_file else 'data'}"
    
    conn_str = r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_path + ';'
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        tables = [t.table_name for t in cursor.tables(tableType='TABLE') if not t.table_name.startswith('MSys')]
        
        state = load_state()
        
        for table_name in tables:
            try:
                query = f"SELECT * FROM [{table_name}]"
                df = pd.read_sql(query, conn)
                if df.empty:
                    print(f"   [INFO] Tabela '{table_name}' vazia, pulando.")
                    continue

                df = map_columns(df, is_full_data=is_full_data_file)
                if df is None or 'ID Mark' not in df.columns:
                    print(f"   [!] Coluna 'ID Mark' não encontrada em '{table_name}'.")
                    continue

                df = df.where(pd.notnull(df), None)
                df['bancada_id'] = int(bancada_id)
                df['sync_at'] = datetime.utcnow().isoformat() + 'Z'

                if not is_full_data_file and 'Save time' in df.columns:
                    try:
                        # Forçar formato ISO robusto com 'Z' (UTC)
                        df['timestamp'] = pd.to_datetime(df['Save time']).dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                    except Exception:
                        df['timestamp'] = df['sync_at']

                df = df[df['ID Mark'].notnull()]
                if df.empty:
                    continue

                # ── SYNC INCREMENTAL ────────────────────────────────────────────────
                # Na primeira execução: sincroniza tudo.
                # Nas próximas: sincroniza apenas registros com ID Mark ainda não visto.
                table_state_key = f"{state_key}_{table_name}"
                seen_ids: set = set(state.get(table_state_key, []))
                
                if seen_ids:
                    # Filtrar apenas registros novos
                    df_new = df[~df['ID Mark'].isin(seen_ids)]
                    if df_new.empty:
                        print(f"   [SKIP] Tabela '{table_name}': sem registros novos ({len(seen_ids)} já sincronizados)")
                        continue
                    print(f"   [Bancada {bancada_id}] INCREMENTAL '{table_name}': {len(df_new)} novos de {len(df)} total")
                    df = df_new
                else:
                    print(f"   [Bancada {bancada_id}] FULL SYNC '{table_name}': {len(df)} registros (primeira vez)")

                # composite_id garante unicidade por bancada
                df['composite_id'] = df['bancada_id'].astype(str) + '_' + df['ID Mark'].astype(str)
                
                allowed_columns = ['composite_id', 'ID Mark', 'bancada_id', 'sync_at']
                if is_full_data_file:
                    allowed_columns += ['raw_payload']
                else:
                    allowed_columns += ['Meter Number', 'Error conclusion', 'Save time', 'timestamp']
                
                df_final = df[[c for c in allowed_columns if c in df.columns]].copy()
                records = df_final.to_dict('records')
                
                chunk_size = 300
                total_chunks = (len(records) + chunk_size - 1) // chunk_size
                
                for i in range(0, len(records), chunk_size):
                    chunk = records[i:i + chunk_size]
                    current_chunk_idx = (i // chunk_size) + 1
                    if total_chunks > 1 and current_chunk_idx % 5 == 0:
                        print(f"      - Progresso: {current_chunk_idx}/{total_chunks}...")
                    supabase.table(target_supabase_table).upsert(
                        chunk, on_conflict='composite_id'
                    ).execute()
                
                # Atualizar estado com os IDs já sincronizados desta tabela
                all_seen = seen_ids.union(set(df['ID Mark'].astype(str).tolist()))
                state[table_state_key] = list(all_seen)
                save_state(state)
                    
                print(f"   [OK] Sincronizado: {target_supabase_table} ({len(records)} registros)")
                
            except Exception as e:
                print(f"   [!] Erro na tabela {table_name}: {e}")
                log_path = os.path.join(os.path.dirname(__file__), "sync_log.txt")
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(f"{datetime.now()} - [Bancada {bancada_id}] Erro na tabela {table_name}: {e}\n")

        conn.close()
    except Exception as e:
        print(f"   [!] Erro crítico no banco {db_path}: {e}")

def main():
    print("=" * 60)
    print("  Sincronizador SaaS Bancadas V5 (Composite ID)")
    print("=" * 60)
    
    bancadas = {
        1: os.getenv("BD1_PATH", r"C:\Users\User\Documents\BD\database1\Full Data.accdb"),
        2: os.getenv("BD2_PATH", r"C:\Users\User\Documents\BD\database2\Full Data.accdb"),
        3: os.getenv("BD3_PATH", r"C:\Users\User\Documents\BD\database3\Full Data.accdb"),
        4: os.getenv("BD4_PATH", r"C:\Users\User\Documents\BD\database4\Full Data.accdb"),
        5: os.getenv("BD5_PATH", r"C:\Users\User\Documents\BD\database5\Full Data.accdb"),
    }

    print("\nCaminhos configurados:")
    for b_id, path in bancadas.items():
        print(f"  Bancada {b_id}: {path}")
    print()

    while True:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Iniciando ciclo de sincronização...")
        try:
            for b_id, path in bancadas.items():
                if not path:
                    continue
                
                # Derivar ambos os caminhos (Data e Full Data) a partir do configurado
                data_path = path.replace("Full Data.accdb", "Data.accdb")
                full_path = path.replace("Data.accdb", "Full Data.accdb")
                
                if os.path.exists(data_path):
                    print(f"\n--- Sincronizando Bancada {b_id} (Data) ---")
                    sync_file(data_path, b_id)
                else:
                    print(f"   [SKIP] Data não encontrado: {data_path}")
                
                if os.path.exists(full_path):
                    print(f"\n--- Sincronizando Bancada {b_id} (Full Data) ---")
                    sync_file(full_path, b_id)
                else:
                    print(f"   [SKIP] Full Data não encontrado: {full_path}")

        except KeyboardInterrupt:
            print("\n[INFO] Sincronização interrompida pelo usuário.")
            break
        except Exception as e:
            print(f"\n[ERRO] Loop principal: {e}")
        
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Próximo ciclo em 5 minutos...")
        time.sleep(300)

if __name__ == "__main__":
    main()
