import { useState, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle2, Database, Clock, Server, Settings as SettingsIcon, Layout, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const BANCADAS = [1, 2, 3, 4, 5];
const AVAILABLE_FIELDS = [
  'ID Mark', 'Meter Number', 'Error conclusion', 'Save time', 'timestamp', 
  'test_point', 'flow_rate', 'temperature', 'pressure', 'status', 'Note'
];

type BancadaPaths = {
  data: string;
  fullData: string;
};

const defaultPaths: Record<number, BancadaPaths> = Object.fromEntries(
  BANCADAS.map(id => [
    id,
    {
      data:     `C:\\Users\\User\\Documents\\BD\\database${id}\\Data.accdb`,
      fullData: `C:\\Users\\User\\Documents\\BD\\database${id}\\Full Data.accdb`,
    },
  ])
);

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [syncInterval, setSyncInterval] = useState('300');
  const [paths, setPaths] = useState<Record<number, BancadaPaths>>(defaultPaths);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [testPointFilter, setTestPointFilter] = useState('qmax');
  const [loading, setLoading] = useState(true);

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
          setVisibleFields(data.admin_settings?.visible_fields || []);
          setTestPointFilter(data.report_vars?.default_test_point_filter || 'qmax');
        }
      } catch (e) {
        console.error('Error fetching config:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const updatePath = (id: number, field: 'data' | 'fullData', value: string) => {
    setPaths(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleToggleField = (field: string) => {
    setVisibleFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
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
    <div className="space-y-10 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">SaaS Settings</h1>
          <p className="text-white/40 mt-2">Manage field visibility, global filters and synchronization.</p>
        </div>
        <div className="flex items-center gap-3">
           <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">ADMIN MODE</span>
        </div>
      </header>

      {/* SaaS Admin Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 glass-card p-6 rounded-3xl border border-white/5 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Layout size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white">Field Management</h2>
              <p className="text-white/40 text-xs">Toggle which database fields are visible in reports and banch details.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {AVAILABLE_FIELDS.map(field => (
              <button
                key={field}
                onClick={() => handleToggleField(field)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl border transition-all group",
                  visibleFields.includes(field)
                    ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                    : "bg-white/[0.02] border-white/5 text-white/30 hover:bg-white/[0.05]"
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden text-xs font-semibold">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    visibleFields.includes(field) ? "bg-indigo-400" : "bg-white/10"
                  )} />
                  <span className="truncate">{field}</span>
                </div>
                <Eye size={14} className={cn(
                  "shrink-0 transition-opacity",
                  visibleFields.includes(field) ? "opacity-100" : "opacity-20 group-hover:opacity-100"
                )} />
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="glass-card p-6 rounded-3xl border border-white/5 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <SettingsIcon size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white">Global Variables</h2>
              <p className="text-white/40 text-xs">Configure system-wide filter defaults.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Default Test Point</label>
              <input 
                type="text"
                value={testPointFilter}
                onChange={e => setTestPointFilter(e.target.value)}
                placeholder="e.g. qmax"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-white/80"
              />
              <p className="text-[10px] text-white/20 mt-2">Used to filter Consolidated reports by default.</p>
            </div>
            
            <div className="pt-4 border-t border-white/5">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-white/30 uppercase">SaaS License</span>
                    <span className="text-emerald-400 font-bold">LIFETIME PRO</span>
                </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sync Configuration (Lower Priority now) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 pt-10 border-t border-white/5"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-blue-500/10">
            <Database size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="font-bold text-white">Sync Bridge Paths</h2>
            <p className="text-white/40 text-xs">Reference of Access database locations for the synchronization script.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {BANCADAS.map((id, i) => (
            <div key={id} className="glass-card p-5 rounded-2xl flex flex-col md:flex-row gap-6">
                <div className="flex items-center gap-2 shrink-0">
                    <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                        {id}
                    </span>
                    <span className="font-semibold text-white/80 whitespace-nowrap">Bancada {id}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    <div>
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest block mb-1">Data Path</span>
                        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5 font-mono text-xs text-white/40 truncate">{paths[id].data}</div>
                    </div>
                    <div>
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest block mb-1">Full Data Path</span>
                        <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5 font-mono text-xs text-white/40 truncate">{paths[id].fullData}</div>
                    </div>
                </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Save Button Floating */}
      <div className="fixed bottom-10 right-10 z-50">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'
          } disabled:opacity-50`}
        >
          {loading ? <RefreshCw className="animate-spin" size={20} /> : saved ? <><CheckCircle2 size={20} /> Changes Applied!</> : <><Save size={20} /> Update System Config</>}
        </button>
      </div>

      {/* Help Tip */}
      <div className="flex items-center justify-center gap-2 text-white/20 text-xs">
          <Clock size={14} />
          Last system update: {new Date().toLocaleString()}
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
import { RefreshCw } from 'lucide-react';
