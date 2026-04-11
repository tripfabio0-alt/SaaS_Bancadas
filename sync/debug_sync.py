import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(URL, KEY)

test_record = {
    "ID Mark": "TEST-0001",
    "bancada_id": 1,
    "Meter Number": "DEBUG-TEST",
    "Error conclusion": "PASS",
    "Save time": "2026-04-11 00:00:00"
}

print(f"Tentando inserir no projeto: {URL}")

try:
    response = supabase.table("data").upsert(test_record).execute()
    print(">>> SUCESSO! O registro foi inserido.")
    print(response)
except Exception as e:
    print(">>> FALHA NA INSERÇÃO!")
    print(f"Erro detalhado: {e}")
