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
    """Mapeia colunas do Access para o padrão do Supabase (Versão de Teste)."""
    mapping = {
        'ID Mark': ['ID Mark', 'ID_Mark', 'IDMark', 'id mark', 'id_mark', 'Mark', 'NO', 'ID', 'No'],
        'Meter Number': ['Meter Number', 'Meter_Number', 'MeterNumber', 'meter number', 'Medidor', 'Serial'],
        'Error conclusion': ['Error conclusion', 'Error_conclusion', 'ErrorConclusion', 'error conclusion', 'Conclusão', 'Resultado'],
        'Save time': ['Save time', 'Save_time', 'SaveTime', 'save time', 'Data', 'Hora', 'Timestamp']
    }
    
    final_mapping = {}
    cols_map = {col.lower().strip().replace('_', ' ').replace('  ', ' '): col for col in df.columns}
    
    for target, variations in mapping.items():
        target_norm = target.lower()
        if target_norm in cols_map:
            final_mapping[cols_map[target_norm]] = target
            continue
        for variant in variations:
            variant_norm = variant.lower().strip().replace('_', ' ')
            if variant_norm in cols_map:
                final_mapping[cols_map[variant_norm]] = target
                break
    
    if final_mapping:
        df = df.rename(columns=final_mapping)
    
    required = ['ID Mark', 'Meter Number', 'Error conclusion', 'Save time']
    for col in required:
        if col not in df.columns:
            df[col] = "N/A"
            
    return df[required + ['bancada_id']].copy()

def test_real_sync():
    print(f"Lendo arquivo: {db_path}")
    if not os.path.exists(db_path):
        print(f"Erro: Arquivo {db_path} não encontrado!")
        return

    conn_str = r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_path + ';'
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        tables = [t.table_name for t in cursor.tables(tableType='TABLE') if not t.table_name.startswith('MSys')]
        if not tables:
            print("Erro: Nenhuma tabela encontrada no Access!")
            return
        
        target_table = tables[0]
        print(f"Lendo registros da tabela: {target_table}")
        
        # Pegar alguns logs para testar mapeamento
        df = pd.read_sql(f"SELECT TOP 5 * FROM [{target_table}]", conn)
        conn.close()
        
        if df.empty:
            print("Erro: Tabela está vazia!")
            return
            
        df['bancada_id'] = 1
        df_mapped = map_columns(df)
        
        print("\n--- DataFrame Mapeado ---")
        print(df_mapped.head())
        
        # Preparar registros
        records = df_mapped.to_dict('records')
        
        print("\n--- Enviando para o Supabase (UPSERT) ---")
        try:
            res = supabase.table("data").upsert(records, on_conflict='ID Mark').execute()
            print("\n>>> SUCESSO NO SYNC DE TESTE!")
            print(f"Registros processados: {len(records)}")
        except Exception as api_err:
            print("\n>>> FALHA NO SUPABASE!")
            print(f"Erro: {api_err}")
            
    except Exception as e:
        print(f"Erro de conexão: {e}")

if __name__ == "__main__":
    test_real_sync()
