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
    # 1. Mapeamento de Meta-dados (Tabela data) - USANDO NOMES EXATOS DO BD ATUAL
    metadata_map = {
        'ID Mark': ['ID Mark', 'ID_Mark', 'IDMark', 'Mark', 'NO', 'ID', 'No'],
        'Meter Number': ['Meter Number', 'MeterNumber', 'Medidor', 'Serial', 'Meter Number'],
        'Error conclusion': ['Final conclusion', 'WME conclusion', 'Final_conclusion', 'WME_conclusion', 'Error conclusion', 'ErrorConclusion', 'Conclusão', 'Resultado'],
        'Save time': ['Save time', 'SaveTime', 'Data', 'Hora', 'Timestamp'],
        'note': ['Note', 'Notas', 'Obs', 'Observação', 'Observacao', 'note']
    }
    
    # 2. Mapeamento de Parâmetros Técnicos (Payload Full Data / Unified Labels)
    tech_map = {
        'ponto_teste': ['Test point', 'Ponto de teste', 'Ponto', 'Point', 'Q'],
        'vazao_real': ['Flow rate', 'Vazão', 'Vazao', 'Flow'],
        'erro_relativo': ['Error', 'Erro', 'Erro relativo', 'Relative Error'],
        'temperatura_celcius': ['Labtemperature', 'Temperature', 'Temperatura', 'Temp', 'T'],
        'pressao_pa': ['Labpressure', 'Pressure', 'Pressão', 'Pressao', 'P'],
        'umidade_percentual': ['Humidity', 'Umidade', 'Humidade', 'H', 'RH', 'Umid'],
        'wme_value': ['WME', 'Weighted Mean Error', 'Erro Medio Ponderado', 'Erro Ponderado'],
        'status_tecnico': ['Status', 'Status técnico', 'Tech Status']
    }

    final_mapping = {}
    cols_map = {col.lower().strip().replace('_', ' ').replace('  ', ' '): col for col in df.columns}
    
    # Executar Mapeamento de Metadados
    for target, variations in metadata_map.items():
        found = False
        target_norm = target.lower().replace('_', ' ')
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
        return df[['ID Mark', 'raw_payload']].copy() if 'ID Mark' in df.columns else df.copy()
    else:
        # No Data (Main), garantimos que os campos essenciais existem, mas NÃO removemos colunas extras
        required = ['ID Mark', 'Meter Number', 'Error conclusion', 'Save time', 'note']
        for col in required:
            if col not in df.columns:
                df[col] = None
        
        return df.copy() # Sincroniza todas as colunas que encontrar no Access


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


def get_valid_columns(table_name):
    try:
        # Pega um registro vazio apenas para ler os headers
        res = supabase.table(table_name).select("*").limit(1).execute()
        if res.data:
            return set(res.data[0].keys())
        # Se estiver vazia, tenta inferir ou retorna vazio (o upsert falhará com segurança)
        return set()
    except Exception:
        return set()

def sync_access_file(db_path, bancada_id):
    if not os.path.exists(db_path):
        return

    is_full_data_file = "Full Data" in db_path
    target_table = "full_data" if is_full_data_file else "data"
    state_key = f"{bancada_id}_{'full' if is_full_data_file else 'data'}"
    
    # 1. Obter colunas válidas no destino
    valid_cols = get_valid_columns(target_table)
    
    conn_str = r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_path + ';'
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        tables = [t.table_name for t in cursor.tables(tableType='TABLE') if not t.table_name.startswith('MSys')]
        state = load_state()
        
        for table_name in tables:
            try:
                if is_full_data_file and table_name.lower() not in ['full data', 'data', 'table1']:
                     continue
                
                query = f"SELECT * FROM [{table_name}]"
                df = pd.read_sql(query, conn)
                if df.empty: continue

                df = map_columns(df, is_full_data=is_full_data_file)
                df = df.where(pd.notnull(df), None)
                df['bancada_id'] = int(bancada_id)
                df['sync_at'] = datetime.utcnow().isoformat() + 'Z'

                if not is_full_data_file and 'Save time' in df.columns:
                    try:
                        df['timestamp'] = pd.to_datetime(df['Save time']).dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                    except Exception:
                        df['timestamp'] = df['sync_at']
                
                if 'ID Mark' in df.columns:
                    df['composite_id'] = df['bancada_id'].astype(str) + '_' + df['ID Mark'].astype(str)
                
                # 2. FILTRAGEM DINÂMICA (SCHEMA-AWARE)
                if valid_cols:
                    cols_to_send = [c for c in df.columns if c in valid_cols]
                    df = df[cols_to_send]
                
                # Incremental
                table_state_key = f"{state_key}_{table_name}"
                seen_ids = set(state.get(table_state_key, []))
                
                if 'ID Mark' in df.columns:
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
        df = pd.read_csv(csv_path, sep=';', encoding='latin1', skiprows=4)
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
        
        for i in range(0, len(records), 500):
            supabase.table('vinculo_lacre').upsert(records[i:i+500], on_conflict='lacre').execute()
            
        print("   [CSV] OK: Sincronização de Lacres concluída.")
        
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
    print("  Sincronizador Universal SaaS Bancadas v9.0")
    print("=" * 60)

    while True:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Iniciando ciclo...")
        try:
            config_res = supabase.table('app_config').select('benches_config, csv_config').eq('id', 1).single().execute()
            config = config_res.data
            
            benches = config.get('benches_config', [])
            csv_cfg = config.get('csv_config', {})
            
            for bench in benches:
                b_id = bench['id']
                b_name = bench['name']
                print(f"\n--- {b_name} ---")
                for paths in bench.get('paths', []):
                    sync_access_file(paths.get('data'), b_id)
                    sync_access_file(paths.get('fullData'), b_id)
            
            if csv_cfg and csv_cfg.get('path'):
                sync_relatorio_csv(csv_cfg['path'])

        except Exception as e:
            print(f"\n[ERRO CRÍTICO] Loop: {e}")
        
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Ciclo finalizado. Aguardando 5 min...")
        time.sleep(300)

if __name__ == "__main__":
    main()
