import pyodbc
import pandas as pd
import os
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv
import time
import json
import hashlib

# Carregar variáveis de ambiente
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERRO] Variáveis SUPABASE_URL e SUPABASE_KEY não encontradas no .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def map_columns(df, is_full_data=False):
    """Mapeia colunas do Access para o padrão do Supabase com normalização canônica."""
    # 1. Mapeamento de Meta-dados (Tabela data)
    metadata_map = {
        'ID Mark': ['ID Mark', 'ID_Mark', 'IDMark', 'Mark', 'NO', 'ID', 'No'],
        'Meter Number': ['Meter Number', 'MeterNumber', 'Medidor', 'Serial', 'Meter Number'],
        'Error conclusion': ['Error conclusion', 'ErrorConclusion', 'Conclusão', 'Resultado'],
        'Save time': ['Save time', 'SaveTime', 'Data', 'Hora', 'Timestamp'],
        'Note': ['Note', 'Notas', 'Obs', 'Observação', 'Observacao', 'note']
    }
    
    # 2. Mapeamento de Parâmetros Técnicos (Payload Full Data)
    tech_map = {
        'test_point': ['Test point', 'Ponto de teste', 'Ponto', 'Point', 'Q'],
        'flow_rate': ['Flow rate', 'Vazão', 'Vazao', 'Flow'],
        'error_relativo': ['Error', 'Erro', 'Erro relativo', 'Relative Error'],
        'temperature': ['Temperature', 'Temperatura', 'Temp', 'T'],
        'pressure': ['Pressure', 'Pressão', 'Pressao', 'P'],
        'status_tecnico': ['Status', 'Status técnico', 'Tech Status']
    }

    final_mapping = {}
    cols_map = {col.lower().strip().replace('_', ' ').replace('  ', ' '): col for col in df.columns}
    
    # Executar Mapeamento de Metadados
    for target, variations in metadata_map.items():
        found = False
        target_norm = target.lower()
        if target_norm in cols_map:
            final_mapping[cols_map[target_norm]] = target
            found = True
        
        if not found:
            for variant in variations:
                v_norm = variant.lower().strip().replace('_', ' ')
                if v_norm in cols_map:
                    final_mapping[cols_map[v_norm]] = target
                    found = True
                    break
    
    # Se for Full Data, mapear também os campos técnicos para chaves canônicas no JSON
    if is_full_data:
        for target, variations in tech_map.items():
            for variant in variations:
                v_norm = variant.lower().strip().replace('_', ' ')
                if v_norm in cols_map:
                    final_mapping[cols_map[v_norm]] = target
                    break

    if final_mapping:
        df = df.rename(columns=final_mapping)
    
    if is_full_data:
        # No Full Data, geramos um payload com chaves canônicas + campos originais não mapeados
        df['raw_payload'] = df.apply(lambda row: row.to_dict(), axis=1)
        return df[['ID Mark', 'raw_payload']].copy()
    else:
        # No Data (Main), garantimos apenas os campos de meta-dados necessários
        required = ['ID Mark', 'Meter Number', 'Error conclusion', 'Save time', 'Note']
        for col in required:
            if col not in df.columns:
                df[col] = None
        
        return df[required].copy()

STATE_FILE = os.path.join(os.path.dirname(__file__), "sync_state.json")

def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception: pass
    return {}

def save_state(state: dict):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)

def sync_access_file(db_path, bancada_id):
    if not os.path.exists(db_path):
        return

    is_full_data_file = "Full Data" in db_path
    target_table = "full_data" if is_full_data_file else "data"
    state_key = f"{bancada_id}_{'full' if is_full_data_file else 'data'}"
    
    conn_str = r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_path + ';'
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        tables = [t.table_name for t in cursor.tables(tableType='TABLE') if not t.table_name.startswith('MSys')]
        state = load_state()
        
        for table_name in tables:
            try:
                # Filtrar tabelas por ano no Data.accdb se necessário, ou processar tudo
                if is_full_data_file and table_name.lower() not in ['full data', 'data', 'table1']:
                     continue
                
                query = f"SELECT * FROM [{table_name}]"
                df = pd.read_sql(query, conn)
                if df.empty: continue

                df = map_columns(df, is_full_data=is_full_data_file)
                df = df.where(pd.notnull(df), None)
                df['bancada_id'] = int(bancada_id)
                df['sync_at'] = datetime.utcnow().isoformat() + 'Z'

                if not is_full_data_file and 'Save time' in df.columns and df['Save time'].notnull().any():
                    try:
                        df['timestamp'] = pd.to_datetime(df['Save time']).dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                    except Exception:
                        df['timestamp'] = df['sync_at']
                
                df['composite_id'] = df['bancada_id'].astype(str) + '_' + df['ID Mark'].astype(str)
                
                # Incremental
                table_state_key = f"{state_key}_{table_name}"
                seen_ids = set(state.get(table_state_key, []))
                df_new = df[~df['ID Mark'].astype(str).isin(seen_ids)]
                
                if df_new.empty: continue
                
                print(f"   [Bancada {bancada_id}] Sincronizando {len(df_new)} novos registros de '{table_name}'...")
                
                records = df_new.to_dict('records')
                for i in range(0, len(records), 300):
                    supabase.table(target_table).upsert(records[i:i+300], on_conflict='composite_id').execute()
                
                state[table_state_key] = list(seen_ids.union(set(df_new['ID Mark'].astype(str).tolist())))
                save_state(state)
            except Exception as e:
                print(f"   [!] Erro na tabela {table_name}: {e}")
        conn.close()
    except Exception as e:
        print(f"   [!] Erro no banco {db_path}: {e}")

def sync_relatorio_csv(csv_path):
    if not os.path.exists(csv_path):
        print(f"   [!] CSV não encontrado: {csv_path}")
        return

    print(f"   [CSV] Sincronizando Vinculo de Lacres: {csv_path}...")
    try:
        # Detectar se o arquivo mudou via hash simples (opcional, aqui faremos incremental por LACRE)
        df = pd.read_csv(csv_path, sep=';', encoding='latin1', skiprows=4) # Pula o cabeçalho decorativo
        
        # Limpar nomes de colunas
        df.columns = [c.strip() for c in df.columns]
        
        mapping = {
            'LACRE': 'lacre',
            'LOTE PRODUTO': 'lote_produto',
            'DATA VINCULO': 'data_vinculo',
            'TIPO': 'tipo',
            'COD. LACRE': 'cod_lacre',
            'SEQ. LOTE': 'seq_lote',
            'COD. INMETRO': 'cod_inmetro',
            'LOTE INMETRO': 'lote_inmetro'
        }
        df = df.rename(columns=mapping)
        df = df[[c for c in mapping.values() if c in df.columns]]
        df = df[df['lacre'].notnull()]
        
        records = df.to_dict('records')
        print(f"   [CSV] Preparando {len(records)} lacres para upload...")
        
        # Upsert em pedaços para evitar timeout (tabela vinculo_lacre)
        for i in range(0, len(records), 500):
            supabase.table('vinculo_lacre').upsert(records[i:i+500], on_conflict='lacre').execute()
            if i % 5000 == 0: print(f"      - {i} processados...")
            
        print("   [CSV] OK: Sincronização de Lacres concluída.")
        
        # Atualizar o timestamp de última sincronização no app_config
        new_last_sync = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        supabase.table('app_config').update({
            "csv_config": {
                "path": csv_path,
                "last_sync": new_last_sync
            }
        }).eq('id', 1).execute()
        
    except Exception as e:
        print(f"   [!] Erro no CSV: {e}")

def main():
    print("=" * 60)
    print("  Sincronizador Universal SaaS Bancadas v6.0")
    print("=" * 60)

    while True:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Iniciando ciclo...")
        try:
            # 1. Buscar Configurações do Supabase
            config_res = supabase.table('app_config').select('benches_config, csv_config').eq('id', 1).single().execute()
            config = config_res.data
            
            benches = config.get('benches_config', [])
            csv_cfg = config.get('csv_config', {})
            
            # 2. Sincronizar Bancadas
            for bench in benches:
                b_id = bench['id']
                b_name = bench['name']
                print(f"\n--- {b_name} ---")
                for paths in bench.get('paths', []):
                    sync_access_file(paths.get('data'), b_id)
                    sync_access_file(paths.get('fullData'), b_id)
            
            # 3. Sincronizar CSV de Terceiros
            if csv_cfg and csv_cfg.get('path'):
                sync_relatorio_csv(csv_cfg['path'])

        except Exception as e:
            print(f"\n[ERRO CRÍTICO] Loop: {e}")
        
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Ciclo finalizado. Aguardando 5 min...")
        time.sleep(300)

if __name__ == "__main__":
    main()
