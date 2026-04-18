"use client";

import { useState, useEffect } from 'react';
import { 
  Save, AlertTriangle, CheckCircle2, Database, Clock, Server, 
  Settings as SettingsIcon, Layout, Eye, Plus, Trash2, FileText, 
  RefreshCw, Layers, ChevronUp, ChevronDown, CheckSquare,
  Lock, Unlock, Shield, EyeOff, Monitor, FileImage, Cpu, ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface BenchPath {
  data: string;
  fullData: string;
}

interface BenchConfig {
  id: number;
  name: string;
  paths: BenchPath[];
}

interface CSVConfig {
  path: string;
  last_sync: string | null;
}

const DISPLAY_FIELDS = [
  { id: 'meter_number', label: 'Série do Medidor', group: 'Básico' },
  { id: 'status_resultado', label: 'Status Resultado', group: 'Básico' },
  { id: 'data_hora', label: 'Data/Hora Teste', group: 'Básico' },
  { id: 'observacao', label: 'Notas/Obs', group: 'Básico' },
  { id: 'lote_produto', label: 'Lote (CSV)', group: 'CSV Batch' },
  { id: 'lacre', label: 'Lacre (CSV)', group: 'CSV Batch' },
  { id: 'cod_lacre', label: 'Cód. Lacre (CSV)', group: 'CSV Batch' },
  { id: 'seq_lote', label: 'Seq. Lote (CSV)', group: 'CSV Batch' },
  { id: 'csv_data_vinculo', label: 'Data Vinc. (CSV)', group: 'CSV Batch' },
  { id: 'cod_inmetro', label: 'Cód. Inmetro', group: 'CSV Batch' },
  { id: 'lote_inmetro', label: 'Lote Inmetro', group: 'CSV Batch' },
  { id: 'ponto_teste', label: 'Ponto (Qmax/min)', group: 'Técnico JSON' },
  { id: 'vazao_real', label: 'Vazão Real', group: 'Técnico JSON' },
  { id: 'erro_relativo', label: 'Erro Relativo (%)', group: 'Técnico JSON' },
  { id: 'temperatura_celcius', label: 'Temperatura Lab', group: 'Técnico JSON' },
  { id: 'pressao_pa', label: 'Pressão Lab', group: 'Técnico JSON' },
  { id: 'umidade_percentual', label: 'Umidade (%)', group: 'Técnico JSON' },
  { id: 'wme_value', label: 'Erro Médio (WME)', group: 'Técnico JSON' },
  { id: 'status_tecnico', label: 'Status Técnico', group: 'Técnico JSON' },
  { id: 'id_mark', label: 'ID Mark Bancada', group: 'Infra' },
  { id: 'data_sincronismo', label: 'Sincronização Cloud', group: 'Infra' },
];

const ADMIN_PIN = "1234";

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  
  const [benches, setBenches] = useState<BenchConfig[]>([]);
  const [csvConfig, setCsvConfig] = useState<CSVConfig>({ path: '', last_sync: null });

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('app_config').select('*').eq('id', 1).single();
        if (data) {
          setVisibleFields(data.admin_settings?.visible_fields || ['meter_number', 'lote_produto', 'lacre', 'status_resultado']);
          setBenches(data.benches_config || []);
          setCsvConfig(data.csv_config || { path: '', last_sync: null });
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    if (isAuthenticated) fetchConfig();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) { setIsAuthenticated(true); setAuthError(false); }
    else { setAuthError(true); setPin(""); }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...visibleFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setVisibleFields(newFields);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await supabase.from('app_config').update({
        admin_settings: { visible_fields: visibleFields, downtime_threshold_minutes: 30 },
        benches_config: benches,
        csv_config: csvConfig,
        updated_at: new Date().toISOString()
      }).eq('id', 1);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="bg-surface-mid p-8 rounded-3xl border border-outline-variant/10 w-full max-w-md shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-8 text-center uppercase tracking-tighter font-headline">Acesso Administrativo</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type={showPin ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)}
              placeholder="Digite o PIN"
              className="w-full bg-surface-lowest border-none rounded-xl py-4 px-5 text-white font-mono"
              autoFocus
            />
            <div className="flex gap-3">
              <Link href="/" className="flex-1 bg-surface-highest/50 py-4 rounded-xl text-white text-center text-xs font-bold uppercase">Cancelar</Link>
              <button type="submit" className="flex-[2] machined-gradient py-4 rounded-xl text-black font-extrabold text-xs uppercase shadow-lg">Entrar</button>
            </div>
            {authError && <p className="text-[10px] text-brand-error font-bold text-center">PIN INVÁLIDO</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight">Configurações de Dados</h1>
          <p className="text-[#dae2fd] opacity-40 mt-2 max-w-2xl">Escolha quais informações das tabelas Access, CSV e JSON serão correlacionadas no painel principal.</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10">
            <h3 className="text-xl font-bold font-headline text-white mb-6 flex items-center gap-3">
              <Layout className="text-brand-primary" /> Inteligência de Exibição Unificada
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {DISPLAY_FIELDS.map(field => {
                 const isVisible = visibleFields.includes(field.id);
                 const index = visibleFields.indexOf(field.id);
                 return (
                   <div key={field.id} className={cn(
                     "p-4 rounded-xl border transition-all flex items-center justify-between group",
                     isVisible ? "bg-brand-primary/5 border-brand-primary/20 shadow-sm" : "bg-surface-highest/5 border-transparent opacity-40"
                   )}>
                      <div className="flex items-center gap-3">
                         <button 
                           onClick={() => setVisibleFields(prev => prev.includes(field.id) ? prev.filter(f => f !== field.id) : [...prev, field.id])}
                           className={cn("w-5 h-5 rounded border flex items-center justify-center", isVisible ? "bg-brand-primary border-brand-primary" : "border-outline-variant/30")}
                         >
                            {isVisible && <CheckSquare size={14} className="text-black" />}
                         </button>
                         <div>
                            <p className="text-xs font-bold text-white">{field.label}</p>
                            <p className="text-[9px] text-brand-primary opacity-60 uppercase font-black">{field.group}</p>
                         </div>
                      </div>
                      {isVisible && (
                        <div className="flex gap-1">
                           <button onClick={() => moveField(index, 'up')} className="p-1 hover:bg-white/10 rounded"><ChevronUp size={14} /></button>
                           <button onClick={() => moveField(index, 'down')} className="p-1 hover:bg-white/10 rounded"><ChevronDown size={14} /></button>
                        </div>
                      )}
                   </div>
                 );
               })}
            </div>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-4 space-y-8">
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10">
            <h3 className="text-xl font-bold font-headline text-white mb-6 flex items-center gap-3"><Cpu className="text-brand-primary" /> Nós de Bancada Ativos</h3>
            <div className="space-y-4">
               {benches.map(bench => (
                 <div key={bench.id} className="bg-surface-high p-4 rounded-xl border border-outline-variant/5">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-black text-brand-primary uppercase">NÓ 0{bench.id}</span>
                       <div className="w-2.5 h-2.5 rounded-full bg-brand-tertiary shadow-[0_0_10px_#4ade80]" />
                    </div>
                    <h4 className="text-white font-bold">{bench.name}</h4>
                    <div className="mt-4 space-y-2">
                       <input 
                         value={bench.paths[0].data} onChange={e => setBenches(benches.map(b => b.id === bench.id ? {...b, paths: [{...b.paths[0], data: e.target.value}]} : b))}
                         className="w-full bg-surface-lowest rounded-lg p-2.5 text-[10px] text-[#dae2fd]/60 font-mono" placeholder="Data (.accdb)"
                       />
                       <input 
                         value={bench.paths[0].fullData} onChange={e => setBenches(benches.map(b => b.id === bench.id ? {...b, paths: [{...b.paths[0], fullData: e.target.value}]} : b))}
                         className="w-full bg-surface-lowest rounded-lg p-2.5 text-[10px] text-[#dae2fd]/60 font-mono" placeholder="Full Data (.accdb)"
                       />
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-12 right-12 flex items-center gap-4">
        {saved && <div className="bg-brand-tertiary text-black px-6 py-4 rounded-xl font-bold shadow-xl">✓ Alterações Salvas</div>}
        <button onClick={handleSave} disabled={loading} className="machined-gradient px-10 py-5 rounded-2xl text-black font-extrabold text-xs uppercase shadow-2xl">
          {loading ? "Processando..." : "Salvar Configuração"}
        </button>
      </div>
    </div>
  );
}
