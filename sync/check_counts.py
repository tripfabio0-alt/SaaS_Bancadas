import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

res = supabase.table("data").select("id", count="exact").execute()
print(f"CONTAGEM TOTAL DE REGISTROS NO SUPABASE: {res.count}")

# Listar os últimos 5 IDs Marks inseridos
res_last = supabase.table("data").select("ID Mark").order("id", desc=True).limit(5).execute()
print("\nÚLTIMOS REGISTROS ENCONTRADOS:")
for r in res_last.data:
    print(f" - {r['ID Mark']}")
