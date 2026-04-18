import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env.local do diretório web
dotenv.config({ path: path.resolve(process.cwd(), 'web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log("--- DATABASE INSPECTION ---");

  // 1. Check app_config (Benches)
  const { data: config } = await supabase.from('app_config').select('*').single();
  console.log("\n[app_config]:", JSON.stringify(config, null, 2));

  // 2. Check data table (Main logs)
  const { data: mainData } = await supabase.from('data').select('*').limit(1).order('sync_at', { ascending: false });
  console.log("\n[data] Columns:", mainData?.[0] ? Object.keys(mainData[0]) : "EMPTY");
  console.log("[data] Latency Check:", mainData?.[0] ? {
    now: new Date().toISOString(),
    sync_at: mainData[0].sync_at,
    diff_minutes: (Date.now() - new Date(mainData[0].sync_at).getTime()) / 60000
  } : "N/A");

  // 3. Check full_data
  const { data: techData } = await supabase.from('full_data').select('*').limit(1);
  console.log("\n[full_data] Columns:", techData?.[0] ? Object.keys(techData[0]) : "EMPTY");
  if (techData?.[0]?.raw_payload) {
    console.log("[full_data] Sample Payload Keys:", Object.keys(techData[0].raw_payload));
  }

  // 4. Check global_uniao view columns
  const { data: viewData } = await supabase.from('global_uniao').select('*').limit(1);
  console.log("\n[global_uniao] Columns:", viewData?.[0] ? Object.keys(viewData[0]) : "EMPTY/VIEW_ERROR");
}

check();
