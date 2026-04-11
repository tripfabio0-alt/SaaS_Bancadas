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

def test_real_sync():
    print(f"Lendo arquivo: {db_path}")
    if not os.path.exists(db_path):
        print("Erro: Arquivo não encontrado!")
        return

    conn_str = r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_path + ';'
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Listar tabelas
        tables = [t.table_name for t in cursor.tables(tableType='TABLE') if not t.table_name.startswith('MSys')]
        if not tables:
            print("Erro: Nenhuma tabela encontrada no Access!")
            return
        
        target_table = tables[0]
        print(f"Lendo 1 registro da tabela: {target_table}")
        
        # Pegar apenas 1 linha
        df = pd.read_sql(f"SELECT TOP 1 * FROM [{target_table}]", conn)
        conn.close()
        
        if df.empty:
            print("Erro: Tabela está vazia!")
            return
            
        print("\n--- Estrutura do DataFrame ---")
        print(df.dtypes)
        print("\n--- Registro Lido ---")
        print(df.iloc[0].to_dict())
        
        # Preparar para o Supabase
        record = df.iloc[0].to_dict()
        record['bancada_id'] = 1
        
        # Debug de nomes de colunas
        print("\n--- Enviando para o Supabase ---")
        print(f"Enviando campos: {list(record.keys())}")
        
        try:
            res = supabase.table("data").upsert(record).execute()
            print("\n>>> SUCESSO ABSOLUTO!")
            print(res)
        except Exception as api_err:
            print("\n>>> FALHA NO SUPABASE!")
            print(f"Erro real: {api_err}")
            
    except Exception as e:
        print(f"Erro de conexão/processamento: {e}")

if __name__ == "__main__":
    test_real_sync()
