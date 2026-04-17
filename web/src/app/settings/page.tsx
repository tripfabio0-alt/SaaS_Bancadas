"use client";

import { useState, useEffect } from 'react';
import { 
  Save, AlertTriangle, CheckCircle2, Database, Clock, Server, 
  Settings as SettingsIcon, Layout, Eye, Plus, Trash2, FileText, 
  FolderSearch, RefreshCw, Layers, ChevronUp, ChevronDown, CheckSquare,
  Lock, Unlock, ShieldSecurity, Visibility, VisibilityOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  { id: 'meter_number', label: 'Meter Serial', group: 'Basic' },
  { id: 'lote_produto', label: 'Lote (CSV)', group: 'CSV' },
  { id: 'lacre', label: 'Lacre (CSV)', group: 'CSV' },
  { id: 'status_resultado', label: 'Status Result', group: 'Basic' },
  { id: 'observacao', label: 'Notes/Obs', group: 'Basic' },
  { id: 'data_hora', label: 'Test Time', group: 'Basic' },
  { id: 'data_access', label: 'Access Time', group: 'Technical' },
  { id: 'id_mark_bancada', label: 'Bench ID Mark', group: 'Technical' },
  { id: 'cod_lacre', label: 'Cod. Lacre (CSV)', group: 'CSV' },
  { id: 'seq_lote', label: 'Seq. Lote (CSV)', group: 'CSV' },
  { id: 'csv_data_vinculo', label: 'Vinc. Date (CSV)', group: 'CSV' },
  { id: 'cod_inmetro', label: 'Cod. Inmetro', group: 'CSV' },
  { id: 'lote_inmetro', label: 'Lote Inmetro', group: 'CSV' },
  { id: 'ponto_teste', label: 'Point (Qmax/min)', group: 'Technical' },
  { id: 'vazao_real', label: 'Flow Rate', group: 'Technical' },
  { id: 'erro_relativo', label: 'Rel. Error', group: 'Technical' },
  { id: 'temperatura_celcius', label: 'Labtemperature', group: 'Technical' },
  { id: 'pressao_pa', label: 'Labpressure', group: 'Technical' },
  { id: 'umidade_percentual', label: 'Humidity', group: 'Technical' },
  { id: 'status_tecnico', label: 'Tech Status', group: 'Technical' },
  { id: 'composite_id', label: 'Composite ID', group: 'System' },
  { id: 'bancada_id', label: 'Bench #', group: 'System' },
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
        console.error('Error fetching config:', e);
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

  const handleToggleField = (field: string) => {
    setVisibleFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
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
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-mid p-8 rounded-3xl border border-outline-variant/10 w-full max-w-md shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <ShieldSecurity size={80} className="text-brand-primary" />
          </div>

          <div className="text-center space-y-2 mb-8 relative z-10">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="text-brand-primary" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white font-headline">Administrative Control</h1>
            <p className="text-xs text-[#dae2fd] opacity-40">Changes require administrative secure elevation.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type={showPin ? "text" : "password"} 
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter Administrator PIN"
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
                  {showPin ? <VisibilityOff size={18} /> : <Visibility size={18} />}
                </button>
              </div>
              {authError && (
                <p className="text-[10px] text-brand-error font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle size={12} /> Access Denied: Invalid Authentication Protocol
                </p>
              )}
            </div>
            
            <button 
              type="submit"
              className="w-full machined-gradient py-4 rounded-xl text-black font-extrabold text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
            >
              Verify Identity
            </button>
          </form>

          <p className="mt-8 text-[10px] text-center text-[#dae2fd] opacity-20 uppercase tracking-[0.1em]">
            Secure Encryption Active — v{APP_VERSION}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight">Administrative Control</h1>
          <p className="text-[#dae2fd] opacity-40 mt-2 max-w-2xl font-body">Manage industrial infrastructure, data pipelines, and system-wide visibility metrics.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-tertiary/10 border border-brand-tertiary/20 rounded-lg text-brand-tertiary">
          <span className="material-icons text-sm">lock</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Secure Session Active</span>
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
                <h3 className="text-xl font-bold font-headline text-white">Display Intelligence</h3>
                <p className="text-xs text-[#dae2fd] opacity-40">Choose which database fields should be mapped and displayed in the main screens.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Ordered Fields */}
              <div className="space-y-4">
                 <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" /> Active Column Sequence
                 </p>
                 <div className="space-y-2">
                   {visibleFields.map((fieldId, idx) => {
                     const f = DISPLAY_FIELDS.find(df => df.id === fieldId);
                     if (!f) return null;
                     return (
                       <div key={fieldId} className="group flex items-center gap-4 bg-surface-high border border-outline-variant/10 p-4 rounded-xl hover:bg-surface-highest transition-all shadow-sm">
                         <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveField(idx, 'up')} disabled={idx === 0} className="hover:text-brand-primary disabled:opacity-0"><ChevronUp size={14} /></button>
                            <button onClick={() => moveField(idx, 'down')} disabled={idx === visibleFields.length - 1} className="hover:text-brand-primary disabled:opacity-0"><ChevronDown size={14} /></button>
                         </div>
                         <div className="flex-1">
                            <div className="text-[9px] text-[#dae2fd] opacity-30 font-bold uppercase tracking-tight">{f.group}</div>
                            <div className="text-sm font-semibold text-white">{f.label}</div>
                         </div>
                         <button onClick={() => handleToggleField(fieldId)} className="text-brand-primary hover:bg-brand-primary/10 p-2 rounded-lg transition-all">
                            <CheckSquare size={18} />
                         </button>
                       </div>
                     );
                   })}
                 </div>
              </div>

              {/* Inactive Fields */}
              <div className="space-y-4">
                 <p className="text-[10px] font-bold text-[#dae2fd] opacity-30 uppercase tracking-[0.2em] mb-4">Hidden Data Pools</p>
                 <div className="flex flex-wrap gap-2">
                   {DISPLAY_FIELDS.filter(f => !visibleFields.includes(f.id)).map(f => (
                     <button 
                       key={f.id}
                       onClick={() => handleToggleField(f.id)}
                       className="px-4 py-2 bg-surface-high border border-outline-variant/10 rounded-xl text-xs font-medium text-[#dae2fd] opacity-50 hover:bg-surface-highest hover:opacity-100 hover:border-brand-primary/30 transition-all flex items-center gap-2"
                     >
                       <Plus size={14} /> {f.label}
                     </button>
                   ))}
                 </div>
              </div>
            </div>
          </div>

          {/* External Assets Manager */}
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 space-y-6">
            <h3 className="text-xl font-bold font-headline text-white flex items-center gap-2">
              <span className="material-icons text-brand-primary">branding_watermark</span>
              Logo Upload
            </h3>
            <div className="border-2 border-dashed border-outline-variant/20 rounded-2xl p-10 flex flex-col items-center justify-center bg-surface-highest/10 hover:bg-surface-highest/20 transition-all group cursor-pointer">
               <div className="w-24 h-24 bg-surface-high rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform border border-outline-variant/10 shadow-lg">
                  <span className="material-icons text-white opacity-20 text-4xl">image</span>
               </div>
               <p className="text-sm font-bold text-white mb-2">Industrial_Bench_v2_Logo.svg</p>
               <p className="text-[10px] text-[#dae2fd] opacity-30 uppercase tracking-widest">Recommended: Vector (SVG)</p>
               <button className="mt-8 px-8 py-3 bg-surface-high border border-outline-variant/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#dae2fd] hover:border-brand-primary/40 transition-all">Replace System Asset</button>
            </div>
          </div>
        </section>

        {/* Right Column: Bench Layouts & System Sync */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          
          {/* Active Nodes Setup */}
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold font-headline text-white flex items-center gap-2">
                <span className="material-icons text-brand-primary">precision_manufacturing</span>
                Bench Nodes
              </h3>
            </div>
            <div className="space-y-4">
               {benches.map(bench => (
                 <div key={bench.id} className="bg-surface-high p-4 rounded-xl border border-outline-variant/5 hover:border-brand-primary/20 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">NODE 0{bench.id}</span>
                       <div className="w-2 h-2 rounded-full bg-brand-tertiary shadow-[0_0_8px_rgba(137,206,255,0.6)]" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-4">{bench.name}</h4>
                    <div className="space-y-4 overflow-hidden max-h-0 group-hover:max-h-[500px] transition-all duration-700 opacity-0 group-hover:opacity-100">
                       <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#dae2fd] opacity-30 uppercase tracking-widest pl-1">Data Path</label>
                          <input 
                            value={bench.paths[0].data} 
                            onChange={e => updatePath(bench.id, 0, 'data', e.target.value)}
                            className="w-full bg-surface-lowest border-none rounded-lg p-3 text-[10px] font-mono text-[#dae2fd]/60 focus:ring-1 focus:ring-brand-primary" 
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#dae2fd] opacity-30 uppercase tracking-widest pl-1">Technical Path</label>
                          <input 
                            value={bench.paths[0].fullData} 
                            onChange={e => updatePath(bench.id, 0, 'fullData', e.target.value)}
                            className="w-full bg-surface-lowest border-none rounded-lg p-3 text-[10px] font-mono text-[#dae2fd]/60 focus:ring-1 focus:ring-brand-primary" 
                          />
                       </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                       <span className="text-[10px] font-bold text-[#dae2fd] opacity-20 uppercase">Config. Protection Active</span>
                       <ChevronDown size={14} className="text-white/20 group-hover:rotate-180 transition-transform" />
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Sync Latency */}
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 space-y-6">
            <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
              <span className="material-icons text-brand-primary">sync</span>
              Datalogger Latency
            </h3>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#dae2fd] opacity-40 uppercase tracking-widest">Global Threshold</span>
                    <span className="text-xs font-bold text-brand-primary">30 Minutes</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-highest rounded-full overflow-hidden">
                     <div className="h-full bg-brand-primary w-[30%]" />
                  </div>
               </div>
               <p className="text-[10px] text-[#dae2fd] opacity-30 leading-relaxed italic">System will mark bench as "IDLE" if no synchronization is detected within this window.</p>
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
              <CheckCircle2 size={18} /> Protocol Updated Successfully
           </motion.div>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-3 machined-gradient px-10 py-5 rounded-[24px] text-black font-extrabold text-xs uppercase tracking-[0.2em] shadow-[0_12px_48px_rgba(53,125,241,0.4)] hover:scale-105 active:scale-95 transition-all"
        >
          {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Save size={20} /> Commit System Changes</>}
        </button>
      </div>
    </div>
  );
}
