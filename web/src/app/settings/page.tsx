"use client";

import { useState, useEffect } from 'react';
import { 
  Save, AlertTriangle, CheckCircle2, Database, Clock, Server, 
  Settings as SettingsIcon, Layout, Eye, Plus, Trash2, FileText, 
  FolderSearch, RefreshCw, Layers, ChevronUp, ChevronDown, CheckSquare
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
  { id: 'temperatura_celcius', label: 'Temp °C', group: 'Technical' },
  { id: 'pressao_pa', label: 'Pressure Pa', group: 'Technical' },
  { id: 'status_tecnico', label: 'Tech Status', group: 'Technical' },
  { id: 'composite_id', label: 'Composite ID', group: 'System' },
  { id: 'bancada_id', label: 'Bench #', group: 'System' },
];

export default function SettingsPage() {
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
    fetchConfig();
  }, []);

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

  // --- Dynamic Bench Management ---
  const addBench = () => {
    const nextId = benches.length > 0 ? Math.max(...benches.map(b => b.id)) + 1 : 1;
    setBenches([...benches, {
      id: nextId,
      name: `Bancada ${nextId}`,
      paths: [{ data: '', fullData: '' }]
    }]);
  };

  const removeBench = (id: number) => {
    setBenches(benches.filter(b => b.id !== id));
  };

  const updateBenchName = (id: number, name: string) => {
    setBenches(benches.map(b => b.id === id ? { ...b, name } : b));
  };

  const addPathToBench = (benchId: number) => {
    setBenches(benches.map(b => b.id === benchId ? {
      ...b,
      paths: [...b.paths, { data: '', fullData: '' }]
    } : b));
  };

  const removePathFromBench = (benchId: number, pathIndex: number) => {
    setBenches(benches.map(b => b.id === benchId ? {
      ...b,
      paths: b.paths.filter((_, i) => i !== pathIndex)
    } : b));
  };

  const updatePath = (benchId: number, pathIndex: number, field: keyof BenchPath, value: string) => {
    setBenches(benches.map(b => b.id === benchId ? {
      ...b,
      paths: b.paths.map((p, i) => i === pathIndex ? { ...p, [field]: value } : p)
    } : b));
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

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">SaaS Admin Console</h1>
          <p className="text-white/40 mt-2">Manage benches, partitions, and external data sources.</p>
        </div>
        <div className="flex items-center gap-3">
           <span className="px-4 py-2 rounded-2xl bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 flex items-center gap-2">
             <Server size={14} /> ADM CONFIG
           </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field Management */}
        <motion.div
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
           className="lg:col-span-2 glass-card p-8 rounded-[32px] border border-white/5 space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
              <Layout size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Display Intelligence</h2>
              <p className="text-white/40 text-sm">Select which fields from the industrial databases should be visible.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Active & Ordered */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-2">Ordered Columns (Drag/Sort)</p>
              <div className="space-y-2">
                {visibleFields.map((fieldId, idx) => {
                  const config = DISPLAY_FIELDS.find(f => f.id === fieldId);
                  if (!config) return null;
                  return (
                    <div key={fieldId} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-2xl group hover:bg-white/[0.05] transition-all">
                      <div className="flex flex-col gap-1 shrink-0">
                        <button 
                          onClick={() => moveField(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-white/10 rounded-md disabled:opacity-0 transition-all"
                        >
                          <ChevronUp size={14} className="text-white/40" />
                        </button>
                        <button 
                          onClick={() => moveField(idx, 'down')}
                          disabled={idx === visibleFields.length - 1}
                          className="p-1 hover:bg-white/10 rounded-md disabled:opacity-0 transition-all"
                        >
                          <ChevronDown size={14} className="text-white/40" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <div className="text-[9px] text-indigo-400/50 font-bold uppercase tracking-tighter">{config.group}</div>
                        <div className="text-sm font-bold text-white/80 leading-tight">{config.label}</div>
                      </div>
                      <button 
                        onClick={() => handleToggleField(fieldId)}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                      >
                        <CheckSquare size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Available to Add */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-2">Available Fields (Hidden)</p>
              <div className="flex flex-wrap gap-2">
                {DISPLAY_FIELDS.filter(f => !visibleFields.includes(f.id)).map(field => (
                  <button
                    key={field.id}
                    onClick={() => handleToggleField(field.id)}
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-bold text-white/30 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Plus size={12} /> {field.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Global Variables */}
        <motion.div
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
           className="glass-card p-8 rounded-[32px] border border-white/5 space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
              <SettingsIcon size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">Global Vars</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Primary Test Filter</label>
              <input 
                type="text"
                value={testPointFilter}
                onChange={e => setTestPointFilter(e.target.value)}
                placeholder="e.g. qmax"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-white"
              />
            </div>
            
            <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-white/30 uppercase">Enterprise Key</span>
                    <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <div className="text-[10px] text-white/10 italic">Valid until April 2027</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* External Data Source: Vinculo de Lacres */}
      <motion.section
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card p-8 rounded-[40px] border border-white/5 space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Vinculo de Lacres</h2>
              <p className="text-white/40 text-sm">Path to the third-party CSV file for batch and seal relationship.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FolderSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
            <input 
              type="text"
              value={csvConfig.path}
              onChange={e => setCsvConfig({ ...csvConfig, path: e.target.value })}
              placeholder="C:\Users\User\Downloads\Relatorio.csv"
              className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-16 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono text-white/60"
            />
          </div>
          <div className="flex items-center gap-3 px-6 py-4 bg-white/[0.02] border border-white/5 rounded-3xl">
             <Clock size={16} className="text-white/20" />
             <div>
               <div className="text-[9px] text-white/20 uppercase font-bold">Last CSV Sync</div>
               <div className="text-xs text-white/40">{csvConfig.last_sync || 'Never'}</div>
             </div>
          </div>
        </div>
      </motion.section>

      {/* Dynamic Bench Management */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
              <Layers size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Benches & Multi-Partitions</h2>
              <p className="text-white/40 text-sm">Configure physical benched and their local database paths.</p>
            </div>
          </div>
          <button 
            onClick={addBench}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/20"
          >
            <Plus size={18} /> New Bench
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence>
            {benches.map((bench) => (
              <motion.div 
                key={bench.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-8 rounded-[40px] border border-white/5 space-y-6 relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <span className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400 font-mono font-bold text-xl">
                      {bench.id}
                    </span>
                    <input 
                      type="text"
                      value={bench.name}
                      onChange={e => updateBenchName(bench.id, e.target.value)}
                      className="bg-transparent border-none text-2xl font-bold text-white focus:outline-none focus:ring-0 w-full"
                    />
                  </div>
                  <button 
                    onClick={() => removeBench(bench.id)}
                    className="p-3 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {bench.paths.map((p, idx) => (
                    <div key={idx} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4 relative group">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest px-2">Data Path (Main)</label>
                          <input 
                            type="text"
                            value={p.data}
                            onChange={e => updatePath(bench.id, idx, 'data', e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 px-5 text-xs font-mono text-white/50 focus:border-blue-500/30 transition-all"
                            placeholder="C:\...\Data.accdb"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest px-2">Full Data Path (Technical)</label>
                          <input 
                            type="text"
                            value={p.fullData}
                            onChange={e => updatePath(bench.id, idx, 'fullData', e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 px-5 text-xs font-mono text-white/50 focus:border-blue-500/30 transition-all"
                            placeholder="C:\...\Full Data.accdb"
                          />
                        </div>
                      </div>
                      {bench.paths.length > 1 && (
                        <button 
                          onClick={() => removePathFromBench(bench.id, idx)}
                          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500/20 border border-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => addPathToBench(bench.id)}
                    className="flex items-center gap-2 text-xs font-bold text-blue-400/60 hover:text-blue-400 transition-all px-4"
                  >
                    <Plus size={14} /> Add Partition / Path
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Save Button Floating */}
      <div className="fixed bottom-12 right-12 z-[100]">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center gap-3 px-10 py-5 rounded-[24px] font-bold text-lg shadow-2xl transition-all duration-500 transform hover:scale-105 active:scale-95 ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-black hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]'
          } disabled:opacity-50`}
        >
          {loading ? <RefreshCw className="animate-spin" size={24} /> : saved ? <><CheckCircle2 size={24} /> Configuration Updated!</> : <><Save size={24} /> Save All Changes</>}
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 text-white/10 text-xs pb-10">
          <Clock size={14} />
          Universal Architecture Sync v1.7.7 Ready
      </div>
    </div>
  );
}
