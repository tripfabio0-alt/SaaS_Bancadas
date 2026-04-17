"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Thermometer, 
  ArrowUpRight, 
  ArrowDownRight,
  Maximize2,
  Download,
  Search
} from 'lucide-react';

export default function Home() {
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [benches, setBenches] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    approved: 0,
    rejected: 0,
    onlineCount: 0,
    latestTemp: 0,
    latestHum: 0,
    trendApproved: '+12%',
    trendRejected: '-2%'
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Summary Data (Counts)
      const { data: records } = await supabase.from('global_uniao').select('*').limit(200);
      
      if (records) {
        const approvedSet = new Set(['Aprovado', 'APROVADO', 'OK', 'Pass']);
        const approved = records.filter(r => approvedSet.has(r.status_resultado)).length;
        const rejected = records.length - approved;

        // Latest climate
        const latestWithClimate = records.find(r => r.temperatura_celcius);
        
        setSummary(prev => ({
          ...prev,
          approved,
          rejected,
          latestTemp: latestWithClimate?.temperatura_celcius || 0,
          latestHum: latestWithClimate?.umidade_percentual || 0
        }));
      }

      // 2. Fetch Recent Log
      const { data: recent } = await supabase
        .from('global_uniao')
        .select('*')
        .order('data_hora', { ascending: false })
        .limit(6);
      setRecentRecords(recent || []);

      // 3. Bench Status
      const { data: config } = await supabase.from('app_config').select('*').eq('id', 1).single();
      const benchConfigs = config?.benches_config || [];
      
      const benchStatusPromises = benchConfigs.map(async (b: any) => {
        const { data: latest } = await supabase.from('data').select('sync_at').eq('bancada_id', b.id).order('sync_at', { ascending: false }).limit(1);
        const lastSync = latest?.[0]?.sync_at;
        const isOnline = lastSync ? (Date.now() - new Date(lastSync).getTime() < 30 * 60 * 1000) : false;
        return { ...b, isOnline };
      });
      
      const resolvedBenches = await Promise.all(benchStatusPromises);
      setBenches(resolvedBenches);
      setSummary(prev => ({ ...prev, onlineCount: resolvedBenches.filter(b => b.isOnline).length }));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const sub = supabase.channel('home-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'data' }, fetchData).subscribe();
    return () => { sub.unsubscribe(); };
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-outline-variant/10 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-brand-primary font-headline">Main Dashboard</h1>
          <p className="text-[#dae2fd] opacity-40 mt-1">Real-time industrial verification metrics across all active benches.</p>
        </div>
        <div className="flex gap-3">
          <button className="machined-gradient text-white font-bold px-6 py-2.5 rounded-xl text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-95">
            <Activity size={14} /> NEW CALIBRATION
          </button>
          <button className="bg-surface-highest/40 border border-outline-variant/20 text-[#dae2fd] px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-surface-highest transition-all">
            EXPORT CSV
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Approved */}
        <div className="bg-surface-mid p-6 rounded-2xl border border-brand-tertiary/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <CheckCircle2 size={64} className="text-brand-tertiary" />
          </div>
          <p className="text-[10px] font-bold text-[#dae2fd] opacity-40 uppercase tracking-[0.2em] mb-4">Total Approved</p>
          <div className="flex items-end gap-2">
            <h2 className="text-5xl font-extrabold text-brand-tertiary font-headline">{summary.approved.toLocaleString()}</h2>
            <span className="text-brand-tertiary text-xs font-bold pb-1 flex items-center">
              <ArrowUpRight size={12} /> {summary.trendApproved}
            </span>
          </div>
          <div className="mt-4 h-1 w-full bg-surface-highest rounded-full overflow-hidden">
            <div className="h-full bg-brand-tertiary w-[88%] transition-all duration-1000" />
          </div>
        </div>

        {/* Total Rejected */}
        <div className="bg-surface-mid p-6 rounded-2xl border border-brand-error/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <XCircle size={64} className="text-brand-error" />
          </div>
          <p className="text-[10px] font-bold text-[#dae2fd] opacity-40 uppercase tracking-[0.2em] mb-4">Total Rejected</p>
          <div className="flex items-end gap-2">
            <h2 className="text-5xl font-extrabold text-brand-error font-headline">{summary.rejected.toLocaleString()}</h2>
            <span className="text-brand-error text-xs font-bold pb-1 flex items-center">
              <ArrowDownRight size={12} /> {summary.trendRejected}
            </span>
          </div>
          <div className="mt-4 h-1 w-full bg-surface-highest rounded-full overflow-hidden">
            <div className="h-full bg-brand-error w-[12%] transition-all duration-1000" />
          </div>
        </div>

        {/* Bench Status */}
        <div className="bg-surface-mid p-6 rounded-2xl col-span-1 md:col-span-2 flex flex-col justify-between border border-outline-variant/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-[#dae2fd] opacity-40 uppercase tracking-[0.2em] mb-1">Bench Status</p>
              <h3 className="text-xl font-bold text-white">{summary.onlineCount}/5 Active Nodes</h3>
            </div>
            <div className="flex -space-x-2">
              {benches.map((b, i) => (
                <div 
                  key={i}
                  title={b.name}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 border-surface-mid flex items-center justify-center text-[10px] font-bold transition-all",
                    b.isOnline ? "bg-brand-primary text-brand-primary-foreground" : "bg-surface-highest text-[#dae2fd]/30"
                  )}
                >
                  0{b.id}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <div className="flex-1 bg-background-deep/50 p-3 rounded-xl border border-outline-variant/5">
              <p className="text-[10px] text-[#dae2fd] opacity-30 uppercase mb-1">Room Accuracy</p>
              <p className="text-lg font-bold text-brand-primary">±0.042%</p>
            </div>
            <div className="flex-1 bg-background-deep/50 p-3 rounded-xl border border-outline-variant/5">
              <p className="text-[10px] text-[#dae2fd] opacity-30 uppercase mb-1 whitespace-nowrap">Lab Temp (Latest)</p>
              <p className="text-lg font-bold text-brand-primary">{summary.latestTemp}°C</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <section className="bg-surface-mid rounded-2xl border border-outline-variant/10 overflow-hidden">
        <div className="p-6 flex justify-between items-center bg-surface-highest/20 border-b border-outline-variant/10">
          <h2 className="text-lg font-bold text-brand-primary flex items-center gap-2">
            <Activity className="text-brand-primary" size={18} /> Measurement Stream
          </h2>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#dae2fd]/40 group-focus-within:text-brand-primary transition-colors" size={14} />
            <input 
              className="bg-background-deep/50 border-outline-variant/10 rounded-xl pl-10 pr-4 py-2 text-sm text-[#dae2fd] focus:ring-1 focus:ring-brand-primary w-64 transition-all" 
              placeholder="Search Meter Number..." 
              type="text"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-highest/10">
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd]/40">Meter Serial</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd]/40">Node</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd]/40">Point</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd]/40">Result</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd]/40 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {recentRecords.map((row, i) => (
                <tr key={i} className="hover:bg-surface-highest/5 transition-colors group">
                  <td className="px-8 py-5 font-mono text-sm text-brand-primary">{row.meter_number}</td>
                  <td className="px-8 py-5 text-sm font-medium text-[#dae2fd]/80">Bancada {row.bancada_id}</td>
                  <td className="px-8 py-5 text-sm text-[#dae2fd]/40">{row.ponto_teste || 'N/A'}</td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                      ['Aprovado', 'APROVADO', 'OK'].includes(row.status_resultado) 
                        ? "bg-brand-tertiary/10 text-brand-tertiary status-glow-ok" 
                        : "bg-brand-error/10 text-brand-error status-glow-nk"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        ['Aprovado', 'APROVADO', 'OK'].includes(row.status_resultado) ? "bg-brand-tertiary" : "bg-brand-error"
                      )} />
                      {row.status_resultado}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right text-xs text-[#dae2fd]/40 tabular-nums">
                    {row.data_hora ? format(new Date(row.data_hora), 'yyyy-MM-dd HH:mm:ss') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-surface-highest/10 flex justify-between items-center text-[10px] text-[#dae2fd]/30 uppercase tracking-widest font-bold">
          <span>Streaming Live Telemetry</span>
          <div className="flex gap-4">
            <button className="hover:text-brand-primary transition-colors">Previous</button>
            <button className="hover:text-brand-primary transition-colors">Next</button>
          </div>
        </div>
      </section>

      {/* Blueprint Grid Accent */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.03] blueprint-grid" />
    </div>
  );
}
