import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectView() {
  console.log("--- VIEW INSPECTION ---");
  
  const { data, error } = await supabase.from('global_uniao').select('*').limit(1);
  
  if (error) {
    console.error("ERRO AO ACESSAR VIEW:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Colunas encontradas na View:", Object.keys(data[0]));
  } else {
    console.log("View retornou zero linhas (mesmo com SELECT *).");
    
    // Testar se a tabela base tem dados
    const { count } = await supabase.from('data').select('*', { count: 'exact', head: true });
    console.log("Contagem na tabela base 'data':", count);
  }
}

inspectView();
