"use client";

import { useState, useEffect } from 'react';
import { 
  Save, AlertTriangle, CheckCircle2, Layout, Eye, RefreshCw, 
  ChevronUp, ChevronDown, CheckSquare, Lock, Cpu, ArrowLeft, Search, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface BenchPath {
  data: string;
  fullData: string;
}

interface BenchConfig {
  id: number;
  name: string;
  paths: BenchPath[];
  isOnline?: boolean;
}

const FRIENDLY_LABELS: Record<string, { label: string, group: string }> = {
  'meter_number': { label: 'Série do Medidor', group: 'Básico' },
  'status_resultado': { label: 'Status Resultado', group: 'Básico' },
  'data_hora': { label: 'Data/Hora Teste', group: 'Básico' },
  'observacao': { label: 'Notas/Obs', group: 'Básico' },
  'lote_produto': { label: 'Lote (CSV)', group: 'CSV Batch' },
  'lacre': { label: 'Lacre (CSV)', group: 'CSV Batch' },
  'ponto_teste': { label: 'Ponto (Qmax/min)', group: 'Tec JSON' },
  'vazao_real': { label: 'Vazão Real', group: 'Tec JSON' },
  'erro_relativo': { label: 'Erro Relativo (%)', group: 'Tec JSON' },
  'temperatura_celcius': { label: 'Temp Lab (Full)', group: 'Clima' },
  'umidade_percentual': { label: 'Umid Lab (Full)', group: 'Clima' },
  'wme_value': { label: 'Erro Médio (WME)', group: 'Tec JSON' },
  'data_sincronismo': { label: 'Sincronização Cloud', group: 'Infra' },
};

const ADMIN_PIN = "1234";

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  
  const [benches, setBenches] = useState<BenchConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDynamicFields = async () => {
    try {
      // Buscar uma amostra maior para garantir detecção de colunas nulas em alguns registros
      const { data: sample } = await supabase.from('global_uniao').select('*').limit(100);
      
      if (sample && sample.length > 0) {
        // Unificar todas as chaves únicas presentes na amostra
        const allKeys = new Set<string>();
        sample.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
        
        const mapped = Array.from(allKeys).map(k => ({
          id: k,
          label: FRIENDLY_LABELS[k]?.label || k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          group: FRIENDLY_LABELS[k]?.group || (k.startsWith('tech_') || k.includes('payload') ? 'Técnico' : 'DB Interno')
        }));
        setAvailableFields(mapped);
      } else {
        // Fallback total se a view estiver retornando vazio
        setAvailableFields(Object.entries(FRIENDLY_LABELS).map(([id, info]) => ({ id, ...info })));
      }
    } catch (e) { 
      console.error("Erro detectando campos:", e); 
      setAvailableFields(Object.entries(FRIENDLY_LABELS).map(([id, info]) => ({ id, ...info })));
    }
  };

  const fetchBenchesStatus = async (configs: any[]) => {
    const promises = configs.map(async (b) => {
      const { data: latest } = await supabase
        .from('data')
        .select('sync_at')
        .or(`bancada_id.eq.${b.id},bancada_id.eq."${b.id}"`)
        .order('sync_at', { ascending: false })
        .limit(1);
      const lastSync = latest?.[0]?.sync_at;
      // Tolerância de 3 horas para ambientes industriais
      const isOnline = lastSync ? (Date.now() - new Date(lastSync).getTime() < 180 * 60 * 1000) : false;
      return { ...b, isOnline };
    });
    return Promise.all(promises);
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('app_config').select('*').eq('id', 1).single();
        if (data) {
          setVisibleFields(data.admin_settings?.visible_fields || ['meter_number', 'lote_produto', 'status_resultado']);
          const resolved = await fetchBenchesStatus(data.benches_config || []);
          setBenches(resolved);
        }
        await fetchDynamicFields();
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    if (isAuthenticated) fetchConfig();
  }, [isAuthenticated]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await supabase.from('app_config').update({
        admin_settings: { visible_fields: visibleFields, downtime_threshold_minutes: 180 },
        benches_config: benches,
        updated_at: new Date().toISOString()
      }).eq('id', 1);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="bg-surface-mid p-8 rounded-3xl border border-outline-variant/10 w-full max-w-md shadow-2xl">
          <h2 className="text-xl font-bold text-text-main mb-8 text-center uppercase tracking-tighter">Elevação de Acesso</h2>
          <form onSubmit={(e) => { e.preventDefault(); if(pin === ADMIN_PIN) setIsAuthenticated(true); else setAuthError(true); }} className="space-y-6">
            <input 
              type="password" value={pin} onChange={e => setPin(e.target.value)}
              placeholder="Digite o PIN de Administrador"
              className="w-full bg-surface-lowest border-none rounded-xl py-4 px-5 text-text-main font-mono text-center text-xl tracking-widest"
              autoFocus
            />
            {authError && <p className="text-[10px] text-brand-error font-bold text-center">PIN INVÁLIDO</p>}
            <button type="submit" className="w-full machined-gradient py-4 rounded-xl text-black font-extrabold text-xs uppercase shadow-lg">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  const filteredFields = availableFields.filter(f => 
    f.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight">Inteligência Dinâmica</h1>
          <p className="text-text-sub mt-2 max-w-2xl">O sistema detectou {availableFields.length} campos disponíveis no seu banco de dados atual.</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 shadow-lg relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
               <div>
                  <h3 className="text-xl font-bold font-headline text-text-main flex items-center gap-3">
                    <Database className="text-brand-primary" /> Mapeamento Automático
                  </h3>
                  <p className="text-[10px] text-text-dim uppercase tracking-widest mt-1">Clique para ativar e use as setas para reordenar no Tabelão</p>
               </div>
               <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={14} />
                  <input 
                    placeholder="Filtrar colunas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-surface-lowest border-none rounded-lg py-2 pl-9 pr-4 text-xs text-text-main"
                  />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
               {filteredFields.map(field => {
                 const isVisible = visibleFields.includes(field.id);
                 const index = visibleFields.indexOf(field.id);
                 return (
                   <div key={field.id} className={cn(
                     "p-3 rounded-xl border transition-all flex items-center justify-between group",
                     isVisible ? "bg-brand-primary/10 border-brand-primary/40" : "bg-surface-highest/5 border-transparent opacity-50"
                   )}>
                      <div className="flex items-center gap-3">
                         <button 
                           onClick={() => setVisibleFields(prev => prev.includes(field.id) ? prev.filter(f => f !== field.id) : [...prev, field.id])}
                           className={cn("w-5 h-5 rounded border flex items-center justify-center", isVisible ? "bg-brand-primary border-brand-primary" : "border-outline-variant/30")}
                         >
                            {isVisible && <CheckSquare size={14} className="text-black" />}
                         </button>
                         <div className="truncate max-w-[150px]">
                            <p className="text-xs font-bold text-text-main truncate">{field.label}</p>
                            <p className="text-[9px] text-text-dim uppercase">{field.group}</p>
                         </div>
                      </div>
                      {isVisible && (
                        <div className="flex gap-1">
                           <button onClick={() => {
                              const newFields = [...visibleFields];
                              if (index > 0) { [newFields[index], newFields[index-1]] = [newFields[index-1], newFields[index]]; setVisibleFields(newFields); }
                           }} className="p-1 hover:bg-black/10 rounded"><ChevronUp size={14} /></button>
                           <button onClick={() => {
                              const newFields = [...visibleFields];
                              if (index < newFields.length - 1) { [newFields[index], newFields[index+1]] = [newFields[index+1], newFields[index]]; setVisibleFields(newFields); }
                           }} className="p-1 hover:bg-black/10 rounded"><ChevronDown size={14} /></button>
                        </div>
                      )}
                   </div>
                 );
               })}
            </div>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-4 space-y-8">
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 shadow-lg">
            <h3 className="text-xl font-bold font-headline text-text-main mb-6 flex items-center gap-3"><Activity className="text-brand-primary" /> Status Real (Tolerância 3h)</h3>
            <div className="space-y-3">
               {benches.map(bench => (
                 <div key={bench.id} className="bg-surface-high p-4 rounded-xl border border-outline-variant/10">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            bench.isOnline ? "bg-brand-tertiary shadow-[0_0_10px_#4ade80]" : "bg-brand-error shadow-[0_0_10px_#f87171]"
                          )} />
                          <h4 className="text-text-main font-bold">{bench.name}</h4>
                       </div>
                       <span className="text-[9px] font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded tracking-tighter transition-all">NÓ 0{bench.id}</span>
                    </div>
                 </div>
               ))}
            </div>
            <p className="mt-4 text-[10px] text-text-dim leading-relaxed italic">O tempo de resposta foi aumentado para 3h para evitar que flutuações na rede industrial marquem as máquinas como offline.</p>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-12 right-12 flex items-center gap-4 z-50">
        {saved && <div className="bg-brand-tertiary text-black px-6 py-4 rounded-xl font-bold shadow-xl animate-bounce">Configurações Sincronizadas</div>}
        <button onClick={handleSave} disabled={loading} className="machined-gradient px-12 py-5 rounded-2xl text-black font-extrabold text-xs uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all">
          {loading ? <RefreshCw className="animate-spin" /> : "Salvar Inteligência de Exibição"}
        </button>
      </div>
    </div>
  );
}

import { Activity } from 'lucide-react';
