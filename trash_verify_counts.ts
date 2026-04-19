import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCounts() {
  console.log("--- INTEGRITY CHECK ---");
  
  const { count: dataCount } = await supabase.from('data').select('*', { count: 'exact', head: true });
  console.log("Tabela 'data':", dataCount, "registros");

  const { count: fullDataCount } = await supabase.from('full_data').select('*', { count: 'exact', head: true });
  console.log("Tabela 'full_data':", fullDataCount, "registros");

  const { count: viewCount } = await supabase.from('global_uniao').select('*', { count: 'exact', head: true });
  console.log("View 'global_uniao' (v5.0):", viewCount, "registros");
  
  if (viewCount === 0 && dataCount > 0) {
    console.warn("ALERTA: A View está vazia mas a tabela Data tem registros! Checar JOIN.");
  }
}

checkCounts();
