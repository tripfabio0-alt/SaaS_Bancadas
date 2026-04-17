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
  { id: 'lote_produto', label: 'Lote (CSV)', group: 'CSV' },
  { id: 'lacre', label: 'Lacre (CSV)', group: 'CSV' },
  { id: 'status_resultado', label: 'Status Resultado', group: 'Básico' },
  { id: 'observacao', label: 'Notas/Obs', group: 'Básico' },
  { id: 'data_hora', label: 'Data/Hora Teste', group: 'Básico' },
  { id: 'data_access', label: 'Data Access', group: 'Técnico' },
  { id: 'id_mark_bancada', label: 'ID Mark Bancada', group: 'Técnico' },
  { id: 'cod_lacre', label: 'Cód. Lacre (CSV)', group: 'CSV' },
  { id: 'seq_lote', label: 'Seq. Lote (CSV)', group: 'CSV' },
  { id: 'csv_data_vinculo', label: 'Data Vinc. (CSV)', group: 'CSV' },
  { id: 'cod_inmetro', label: 'Cód. Inmetro', group: 'CSV' },
  { id: 'lote_inmetro', label: 'Lote Inmetro', group: 'CSV' },
  { id: 'ponto_teste', label: 'Ponto (Qmax/min)', group: 'Técnico' },
  { id: 'vazao_real', label: 'Vazão', group: 'Técnico' },
  { id: 'erro_relativo', label: 'Erro Rel.', group: 'Técnico' },
  { id: 'temperatura_celcius', label: 'Temperatura Lab', group: 'Técnico' },
  { id: 'pressao_pa', label: 'Pressão Lab', group: 'Técnico' },
  { id: 'umidade_percentual', label: 'Umidade', group: 'Técnico' },
  { id: 'status_tecnico', label: 'Status Técnico', group: 'Técnico' },
];

const ADMIN_PIN = "1234";
const APP_VERSION = "2.0.1";

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [testPointFilter, setTestPointFilter] = useState('qmax');
  
  // Dynamic Configs
  const [benches, setBenches] = useState<BenchConfig[]>([]);
  const [csvConfig, setCsvConfig] = useState<CSVConfig>({ path: '', last_sync: null });

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('*')
          .eq('id', 1)
          .single();
        
        if (data) {
          setVisibleFields(data.admin_settings?.visible_fields || ['meter_number', 'lote_produto', 'lacre', 'status_resultado']);
          setTestPointFilter(data.report_vars?.default_test_point_filter || 'qmax');
          setBenches(data.benches_config || []);
          setCsvConfig(data.csv_config || { path: '', last_sync: null });
        }
      } catch (e) {
        console.error('Erro ao buscar config:', e);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetchConfig();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setPin("");
    }
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
      await supabase
        .from('app_config')
        .update({
          admin_settings: { 
            visible_fields: visibleFields,
            downtime_threshold_minutes: 30
          },
          report_vars: {
            default_test_point_filter: testPointFilter
          },
          benches_config: benches,
          csv_config: csvConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Error saving config:', e);
    } finally {
      setLoading(false);
    }
  };

  const updatePath = (benchId: number, pathIndex: number, field: keyof BenchPath, value: string) => {
    setBenches(benches.map(b => b.id === benchId ? {
      ...b,
      paths: b.paths.map((p, i) => i === pathIndex ? { ...p, [field]: value } : p)
    } : b));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-mid p-8 rounded-3xl border border-outline-variant/10 w-full max-w-md shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Shield size={80} className="text-brand-primary" />
          </div>

          <div className="text-center space-y-2 mb-8 relative z-10">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="text-brand-primary" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white font-headline">Controle Administrativo</h1>
            <p className="text-xs text-[#dae2fd] opacity-40">Alterações exigem elevação de acesso seguro.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type={showPin ? "text" : "password"} 
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Digite o PIN de Administrador"
                  className={cn(
                    "w-full bg-surface-lowest border-none rounded-xl py-4 px-5 text-on-surface focus:ring-2 focus:ring-brand-primary transition-all font-mono",
                    authError ? "ring-2 ring-brand-error/50" : ""
                  )}
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {authError && (
                <p className="text-[10px] text-brand-error font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle size={12} /> Acesso Negado: PIN Inválido
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <Link 
                href="/"
                className="flex-1 bg-surface-highest/50 py-4 rounded-xl text-white font-bold text-xs uppercase tracking-widest text-center hover:bg-surface-highest transition-all"
              >
                Cancelar
              </Link>
              <button 
                type="submit"
                className="flex-[2] machined-gradient py-4 rounded-xl text-black font-extrabold text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all text-center"
              >
                Verificar
              </button>
            </div>
          </form>

          <p className="mt-8 text-[10px] text-center text-[#dae2fd] opacity-20 uppercase tracking-[0.1em]">
            Criptografia Ativa — v{APP_VERSION}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight">Configurações do Sistema</h1>
          <p className="text-[#dae2fd] opacity-40 mt-2 max-w-2xl font-body">Gerencie a infraestrutura industrial, pipelines de dados e métricas de visibilidade.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-tertiary/10 border border-brand-tertiary/20 rounded-lg text-brand-tertiary">
          <Lock size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sessão Segura Ativa</span>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Column: Column Intelligence */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
                <Layout size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold font-headline text-white">Inteligência de Exibição</h3>
                <p className="text-xs text-[#dae2fd] opacity-40">Escolha quais campos do banco de dados devem ser mapeados e exibidos nas telas principais.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {DISPLAY_FIELDS.map(field => {
                 const isVisible = visibleFields.includes(field.id);
                 const index = visibleFields.indexOf(field.id);
                 return (
                   <div key={field.id} className={cn(
                     "p-4 rounded-xl border transition-all flex items-center justify-between group",
                     isVisible ? "bg-brand-primary/5 border-brand-primary/20" : "bg-surface-highest/10 border-outline-variant/5 opacity-50"
                   )}>
                      <div className="flex items-center gap-3">
                         <button 
                           onClick={() => {
                             setVisibleFields(prev => 
                               prev.includes(field.id) ? prev.filter(f => f !== field.id) : [...prev, field.id]
                             );
                           }}
                           className={cn(
                             "w-5 h-5 rounded border flex items-center justify-center transition-all",
                             isVisible ? "bg-brand-primary border-brand-primary" : "border-outline-variant/30"
                           )}
                         >
                            {isVisible && <CheckSquare size={14} className="text-black" />}
                         </button>
                         <div>
                            <p className="text-xs font-bold text-white">{field.label}</p>
                            <p className="text-[9px] text-[#dae2fd] opacity-30 uppercase">{field.group}</p>
                         </div>
                      </div>
                      
                      {isVisible && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }} className="p-1 hover:bg-white/10 rounded"><ChevronUp size={14} /></button>
                           <button onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }} className="p-1 hover:bg-white/10 rounded"><ChevronDown size={14} /></button>
                        </div>
                      )}
                   </div>
                 );
               })}
            </div>
          </div>

          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 space-y-6">
            <h3 className="text-xl font-bold font-headline text-white flex items-center gap-2">
              <Monitor size={20} className="text-brand-primary" />
              Upload de Logotipos
            </h3>
            <div className="border-2 border-dashed border-outline-variant/20 rounded-2xl p-10 flex flex-col items-center justify-center bg-surface-highest/10 hover:bg-surface-highest/20 transition-all group cursor-pointer">
               <div className="w-24 h-24 bg-surface-high rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform border border-outline-variant/10 shadow-lg">
                  <FileImage size={48} className="text-white opacity-20" />
               </div>
               <p className="text-sm font-bold text-white mb-2">Industrial_Bench_v2_Logo.svg</p>
               <p className="text-[10px] text-[#dae2fd] opacity-30 uppercase tracking-widest">Recomendado: Vetor (SVG)</p>
               <button className="mt-8 px-8 py-3 bg-surface-high border border-outline-variant/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#dae2fd] hover:border-brand-primary/40 transition-all">Substituir Ativo</button>
            </div>
          </div>
        </section>

        {/* Right Column: Bench Layouts & System Sync */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 space-y-8">
            <h3 className="text-xl font-bold font-headline text-white flex items-center gap-2">
              <Cpu size={20} className="text-brand-primary" />
              Nós de Bancada
            </h3>
            <div className="space-y-4">
               {benches.map(bench => (
                 <div key={bench.id} className="bg-surface-high p-4 rounded-xl border border-outline-variant/5 hover:border-brand-primary/20 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">NÓ 0{bench.id}</span>
                       <div className="w-2 h-2 rounded-full bg-brand-tertiary shadow-[0_0_8px_rgba(137,206,255,0.6)]" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-4">{bench.name}</h4>
                    <div className="space-y-4 overflow-hidden max-h-0 group-hover:max-h-[500px] transition-all duration-700 opacity-0 group-hover:opacity-100">
                       <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#dae2fd] opacity-30 uppercase tracking-widest pl-1">Caminho de Dados</label>
                          <input 
                            value={bench.paths[0].data} 
                            onChange={e => updatePath(bench.id, 0, 'data', e.target.value)}
                            className="w-full bg-surface-lowest border-none rounded-lg p-3 text-[10px] font-mono text-[#dae2fd]/60 focus:ring-1 focus:ring-brand-primary" 
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#dae2fd] opacity-30 uppercase tracking-widest pl-1">Caminho Técnico</label>
                          <input 
                            value={bench.paths[0].fullData} 
                            onChange={e => updatePath(bench.id, 0, 'fullData', e.target.value)}
                            className="w-full bg-surface-lowest border-none rounded-lg p-3 text-[10px] font-mono text-[#dae2fd]/60 focus:ring-1 focus:ring-brand-primary" 
                          />
                       </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                       <span className="text-[10px] font-bold text-[#dae2fd] opacity-20 uppercase">Proteção Ativa</span>
                       <ChevronDown size={14} className="text-white/20 group-hover:rotate-180 transition-transform" />
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 space-y-6">
            <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
              <RefreshCw size={18} className="text-brand-primary" />
              Latência do Datalogger
            </h3>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#dae2fd] opacity-40 uppercase tracking-widest">Limite Global</span>
                    <span className="text-xs font-bold text-brand-primary">30 Minutos</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-highest rounded-full overflow-hidden">
                     <div className="h-full bg-brand-primary w-[30%]" />
                  </div>
               </div>
               <p className="text-[10px] text-[#dae2fd] opacity-30 leading-relaxed italic">O sistema marcará a bancada como "IDLE" se nenhuma sincronização for detectada neste intervalo.</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Global Save Action */}
      <div className="fixed bottom-12 right-12 z-[100] flex items-center gap-4">
        {saved && (
           <motion.div 
             initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
             className="bg-brand-tertiary text-black px-6 py-4 rounded-xl font-bold flex items-center gap-2 shadow-xl"
           >
              <CheckCircle2 size={18} /> Protocolo Atualizado com Sucesso
           </motion.div>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-3 machined-gradient px-10 py-5 rounded-[24px] text-black font-extrabold text-xs uppercase tracking-[0.2em] shadow-[0_12px_48px_rgba(53,125,241,0.4)] hover:scale-105 active:scale-95 transition-all"
        >
          {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Alterações</>}
        </button>
      </div>
    </div>
  );
}
