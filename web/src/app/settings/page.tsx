"use client";

import { useState, useEffect } from 'react';
import { 
  Save, AlertTriangle, CheckCircle2, Layout, Eye, RefreshCw, 
  ChevronUp, ChevronDown, CheckSquare, Lock, Cpu, ArrowLeft, Search, Database,
  Settings, Server, Info, Plus, Trash2, Link as LinkIcon, Activity
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
  isOnline?: boolean;
}

const FRIENDLY_LABELS: Record<string, { label: string, group: string, original?: string }> = {
  'data_hora': { label: 'Data/Hora Teste', group: 'Básico', original: 'Save time' },
  'meter_number': { label: 'Série do Medidor', group: 'Básico', original: 'Meter Number' },
  'id_mark': { label: 'Identificador (ID Mark)', group: 'Básico', original: 'ID Mark' },
  'status_resultado': { label: 'Status Resultado', group: 'Básico', original: 'Error conclusion' },
  'observacao': { label: 'Notas/Obs', group: 'Básico', original: 'note' },
  'lote_produto': { label: 'Lote (CSV)', group: 'Lote CSV' },
  'lacre': { label: 'Lacre (CSV)', group: 'Lote CSV' },
  'temperatura_celcius': { label: 'Temperatura Laboratório', group: 'Clima' },
  'umidade_percentual': { label: 'Umidade Relativa', group: 'Clima' },
  'vazao_real': { label: 'Vazão Real', group: 'Técnico' },
  'erro_relativo': { label: 'Erro Relativo (%)', group: 'Técnico' },
  'ponto_teste': { label: 'Ponto de Teste (Q)', group: 'Técnico' },
  'wme_value': { label: 'Erro Ponderado (WME)', group: 'Técnico' },
  'data_sincronismo': { label: 'Data Sincronismo Cloud', group: 'Infra' },
};

const ADMIN_PIN = "1234";

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<'infra' | 'visual'>('infra');

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  
  const [benches, setBenches] = useState<BenchConfig[]>([]);
  const [csvPath, setCsvPath] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDynamicFields = async () => {
    try {
      const { data: sample } = await supabase.from('global_uniao').select('*').limit(10);
      
      if (sample && sample.length > 0) {
        const allKeys = new Set<string>();
        sample.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
        
        // DESDUPLICAÇÃO: Ocultar nomes originais se existir um alias amigável
        const originalsToHide = new Set(Object.values(FRIENDLY_LABELS).map(v => v.original).filter(Boolean));
        
        const mapped = Array.from(allKeys)
          .filter(k => !originalsToHide.has(k)) // Filtrar duplicatas
          .map(k => ({
            id: k,
            label: FRIENDLY_LABELS[k]?.label || k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            group: FRIENDLY_LABELS[k]?.group || (k.startsWith('tech_') || k.includes('payload') ? 'Técnico' : 'DB Interno')
          }));
        setAvailableFields(mapped);
      } else {
        setAvailableFields(Object.entries(FRIENDLY_LABELS).map(([id, info]) => ({ id, ...info })));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('app_config').select('*').eq('id', 1).single();
        if (data) {
          setVisibleFields(data.admin_settings?.visible_fields || ['meter_number', 'lote_produto', 'status_resultado']);
          setBenches(data.benches_config || []);
          setCsvPath(data.csv_config?.path || "");
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
        csv_config: { path: csvPath, last_sync: new Date().toISOString() },
        updated_at: new Date().toISOString()
      }).eq('id', 1);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="bg-surface-mid p-10 rounded-[32px] border border-outline-variant/10 w-full max-w-md shadow-2xl">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-brand-primary">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-text-main mb-2 text-center uppercase tracking-tighter">Administração Industrial</h2>
          <p className="text-[10px] text-text-dim text-center uppercase font-bold tracking-widest mb-8">Insira o PIN de Segurança</p>
          <form onSubmit={(e) => { e.preventDefault(); if(pin === ADMIN_PIN) setIsAuthenticated(true); else setAuthError(true); }} className="space-y-6">
            <input 
              type="password" value={pin} onChange={e => setPin(e.target.value)}
              className="w-full bg-surface-lowest border-none rounded-2xl py-5 px-5 text-text-main font-mono text-center text-2xl tracking-[0.5em] shadow-inner"
              autoFocus
            />
            {authError && <p className="text-[10px] text-brand-error font-extrabold text-center animate-shake">ACESSO NEGADO</p>}
            <button type="submit" className="w-full machined-gradient py-5 rounded-2xl text-black font-black text-xs uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Desbloquear Painel</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-8">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <Link href="/" className="text-text-dim hover:text-brand-primary transition-all"><ArrowLeft size={20} /></Link>
              <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight">Engenharia do SaaS</h1>
           </div>
           <p className="text-text-sub max-w-2xl">Gerencie infraestrutura física (caminhos Access) e inteligência visual (exibição de dados).</p>
        </div>
        
        <div className="flex bg-surface-mid p-1.5 rounded-2xl border border-outline-variant/10 shadow-lg">
           <button 
             onClick={() => setActiveTab('infra')}
             className={cn(
               "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
               activeTab === 'infra' ? "bg-brand-primary text-black shadow-md" : "text-text-dim hover:text-text-main"
             )}
           >
             <Server size={14} /> Infraestrutura
           </button>
           <button 
             onClick={() => setActiveTab('visual')}
             className={cn(
               "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
               activeTab === 'visual' ? "bg-brand-primary text-black shadow-md" : "text-text-dim hover:text-text-main"
             )}
           >
             <Layout size={14} /> Visualização
           </button>
        </div>
      </header>

      <div className="min-h-[60vh]">
        <AnimatePresence mode="wait">
          {activeTab === 'infra' ? (
            <motion.div key="infra" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-6">
                     <div className="bg-surface-mid p-8 rounded-3xl border border-outline-variant/10 shadow-xl">
                        <div className="flex justify-between items-center mb-8">
                           <h3 className="text-xl font-bold font-headline text-text-main flex items-center gap-3"><Cpu size={20} className="text-brand-primary" /> Nós de Bancada (Sincronismo)</h3>
                           <button onClick={() => setBenches([...benches, { id: benches.length + 1, name: `Bancada ${benches.length + 1}`, paths: [{ data: '', fullData: '' }] }])} className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary/20 transition-all"><Plus size={20} /></button>
                        </div>
                        
                        <div className="space-y-4">
                           {benches.map((bench, bIdx) => (
                             <div key={bench.id} className="p-6 bg-surface-lowest rounded-2xl border border-outline-variant/10 space-y-4 relative group">
                                <button onClick={() => setBenches(benches.filter((_, i) => i !== bIdx))} className="absolute top-4 right-4 text-brand-error opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                   <div className="md:col-span-1">
                                      <label className="text-[9px] font-black uppercase text-text-dim ml-1">Identificador</label>
                                      <input 
                                        value={bench.name} onChange={e => {
                                          const newBenches = [...benches];
                                          newBenches[bIdx].name = e.target.value;
                                          setBenches(newBenches);
                                        }}
                                        className="w-full bg-surface-mid border-none rounded-xl py-3 px-4 text-xs text-text-main font-bold mt-1"
                                      />
                                   </div>
                                   <div className="md:col-span-3 space-y-3">
                                      {bench.paths.map((p, pIdx) => (
                                        <div key={pIdx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                           <div>
                                              <label className="text-[9px] font-black uppercase text-text-dim ml-1">Caminho Data.accdb</label>
                                              <input 
                                                value={p.data} onChange={e => {
                                                  const newB = [...benches];
                                                  newB[bIdx].paths[pIdx].data = e.target.value;
                                                  setBenches(newB);
                                                }}
                                                className="w-full bg-surface-mid border-none rounded-xl py-3 px-4 text-[10px] text-text-sub mt-1 font-mono"
                                                placeholder="C:/Caminho/Banco/Data.accdb"
                                              />
                                           </div>
                                           <div>
                                              <label className="text-[9px] font-black uppercase text-text-dim ml-1">Caminho FullData.accdb</label>
                                              <input 
                                                value={p.fullData} onChange={e => {
                                                  const newB = [...benches];
                                                  newB[bIdx].paths[pIdx].fullData = e.target.value;
                                                  setBenches(newB);
                                                }}
                                                className="w-full bg-surface-mid border-none rounded-xl py-3 px-4 text-[10px] text-text-sub mt-1 font-mono"
                                                placeholder="C:/Caminho/Banco/Full_Data.accdb"
                                              />
                                           </div>
                                        </div>
                                      ))}
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="bg-surface-mid p-8 rounded-3xl border border-outline-variant/10 shadow-xl">
                        <h3 className="text-xl font-bold font-headline text-text-main mb-6 flex items-center gap-3"><Database size={20} className="text-brand-tertiary" /> Relatório Industrial (CSV)</h3>
                        <div>
                           <label className="text-[9px] font-black uppercase text-text-dim ml-1">Caminho do Relatorio.csv (Relatorio Tecnicon)</label>
                           <div className="relative mt-1">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                              <input 
                                value={csvPath} onChange={e => setCsvPath(e.target.value)}
                                className="w-full bg-surface-lowest border-none rounded-2xl py-4 pl-12 pr-4 text-xs text-text-main font-mono shadow-inner"
                                placeholder="C:/Users/User/Documents/Relatorio.csv"
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  <aside className="lg:col-span-4 space-y-6">
                     <div className="bg-surface-mid p-8 rounded-3xl border border-outline-variant/10 shadow-lg">
                        <h3 className="text-lg font-bold font-headline text-text-main mb-4 flex items-center gap-3"><LinkIcon size={18} className="text-brand-primary" /> Relacionamento</h3>
                        <div className="p-4 bg-surface-highest/10 rounded-2xl border border-brand-primary/10">
                           <p className="text-[10px] font-black uppercase text-brand-primary mb-1">Chave Industrial Mestre</p>
                           <p className="text-2xl font-black text-text-main tracking-tighter">ID Mark</p>
                           <p className="text-[9px] text-text-dim mt-2 leading-relaxed">Esta chave é o único identificador usado pelo SaaS para cruzar o <b>Data</b> com o <b>Full Data</b> em tempo real.</p>
                        </div>
                     </div>
                     <div className="bg-surface-mid p-8 rounded-3xl border border-outline-variant/10 shadow-lg flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary mb-4 animate-pulse">
                           <Activity size={32} />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-[#dae2fd]">Monitor em Espera</h4>
                        <p className="text-[10px] text-text-dim mt-2">Salve as configurações para que o Sincronizador local comece a processar os novos caminhos.</p>
                     </div>
                  </aside>
               </div>
            </motion.div>
          ) : (
            <motion.div key="visual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
               <div className="bg-surface-mid p-8 rounded-3xl border border-outline-variant/10 shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-outline-variant/5 pb-8">
                     <div>
                        <h3 className="text-xl font-bold font-headline text-text-main flex items-center gap-3"><Layout size={20} className="text-brand-primary" /> Inteligência de Visualização</h3>
                        <p className="text-[10px] text-text-dim uppercase tracking-widest mt-1 font-bold">O SaaS removeu duplicatas técnicas para mostrar apenas nomes amigáveis.</p>
                     </div>
                     <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                        <input 
                          placeholder="Pesquisar por nome ou ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                          className="w-full bg-surface-lowest border-none rounded-xl py-3 pl-12 pr-4 text-xs text-text-main"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[500px] overflow-y-auto custom-scrollbar pr-4">
                     {availableFields
                       .filter(f => f.label.toLowerCase().includes(searchTerm.toLowerCase()) || f.id.toLowerCase().includes(searchTerm.toLowerCase()))
                       .map(field => {
                        const isVisible = visibleFields.includes(field.id);
                        const index = visibleFields.indexOf(field.id);
                        return (
                          <div key={field.id} className={cn(
                            "p-4 rounded-2xl border-2 transition-all flex items-center justify-between group",
                            isVisible ? "bg-brand-primary/10 border-brand-primary/40 shadow-inner" : "bg-surface-highest/5 border-transparent opacity-40 grayscale"
                          )}>
                             <div className="flex items-center gap-4">
                                <button 
                                  onClick={() => setVisibleFields(prev => prev.includes(field.id) ? prev.filter(f => f !== field.id) : [...prev, field.id])}
                                  className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", isVisible ? "bg-brand-primary border-brand-primary" : "border-outline-variant/30")}
                                >
                                   {isVisible && <CheckSquare size={16} className="text-black" />}
                                </button>
                                <div>
                                   <p className="text-xs font-black text-text-main uppercase tracking-tighter">{field.label}</p>
                                   <p className="text-[9px] text-text-dim font-bold">{field.group}</p>
                                </div>
                             </div>
                             {isVisible && (
                               <div className="flex flex-col gap-1">
                                  <button onClick={() => {
                                     const newFields = [...visibleFields];
                                     if (index > 0) { [newFields[index], newFields[index-1]] = [newFields[index-1], newFields[index]]; setVisibleFields(newFields); }
                                  }} className="p-1.5 hover:bg-brand-primary/20 rounded-lg text-brand-primary"><ChevronUp size={16} /></button>
                                  <button onClick={() => {
                                     const newFields = [...visibleFields];
                                     if (index < newFields.length - 1) { [newFields[index], newFields[index+1]] = [newFields[index+1], newFields[index]]; setVisibleFields(newFields); }
                                  }} className="p-1.5 hover:bg-brand-primary/20 rounded-lg text-brand-primary"><ChevronDown size={16} /></button>
                               </div>
                             )}
                          </div>
                        );
                     })}
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-12 right-12 flex items-center gap-4 z-50">
        {saved && (
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-brand-tertiary text-black px-8 py-5 rounded-2xl font-black shadow-2xl flex items-center gap-3">
             <CheckCircle2 /> SINAL DE SINCRONISMO ENVIADO
          </motion.div>
        )}
        <button onClick={handleSave} disabled={loading} className="machined-gradient px-12 py-6 rounded-[24px] text-black font-black text-xs uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 border-4 border-black">
          {loading ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
          {loading ? "Processando..." : "Salvar Infraestrutura"}
        </button>
      </div>
    </div>
  );
}
