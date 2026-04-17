"use client";

import { useState, useEffect } from 'react';
import { 
  Download, 
  Calendar, 
  Search,
  Filter,
  RefreshCw,
  History,
  TrendingUp,
  Activity,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle2,
  Zap,
  Share2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

const STITCH_PERIODS = ['Last 24h', '7 Days', '30 Days', 'Custom'];

const FIELD_LABELS: Record<string, string> = {
  'meter_number': 'Meter Serial',
  'lote_produto': 'Lote (CSV)',
  'lacre': 'Lacre',
  'status_resultado': 'Conclusion Status',
  'observacao': 'Obs/Notes',
  'data_hora': 'Timestamp',
  'ponto_teste': 'Test Point',
  'vazao_real': 'Flow Rate',
  'erro_relativo': 'Rel. Error',
  'temperatura_celcius': 'Labtemperature',
  'pressao_pa': 'Labpressure',
  'umidade_percentual': 'Humidity',
  'wme_value': 'WME'
};

export default function ReportsPage() {
  const [activePeriod, setActivePeriod] = useState('7 Days');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);

  const fetchConfig = async () => {
    const { data } = await supabase.from('app_config').select('admin_settings').eq('id', 1).single();
    if (data?.admin_settings?.visible_fields) {
      setVisibleFields(data.admin_settings.visible_fields);
    } else {
      setVisibleFields(['meter_number', 'lote_produto', 'status_resultado', 'data_hora']);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await fetchConfig();
      let query = supabase.from('global_uniao').select('*');
      
      if (searchTerm) {
        query = query.or(`meter_number.ilike.%${searchTerm}%,lote_produto.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query.order('data_hora', { ascending: false }).limit(100);
      
      if (error || !data || data.length === 0) {
        console.warn('View "global_uniao" empty or failing. Attempting direct fallback to "data" table...');
        const { data: directData, error: directError } = await supabase
          .from('data')
          .select('*, meter_number:"Meter Number", status_resultado:"Error conclusion", data_hora:"Save time"')
          .order('sync_at', { ascending: false })
          .limit(100);
        
        if (directError) throw directError;
        setReportData(directData || []);
      } else {
        setReportData(data);
      }
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activePeriod]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight mb-2">
            Industrial Intelligence
          </h1>
          <p className="text-[#dae2fd] opacity-40 font-medium italic">Unified Global Registry — Consensus of access logs and CSV production batches.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface-mid p-1.5 rounded-xl border border-outline-variant/10">
          {STITCH_PERIODS.map((t) => (
            <button
              key={t}
              onClick={() => setActivePeriod(t)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                activePeriod === t ? "bg-surface-highest text-brand-primary shadow-lg" : "text-[#dae2fd] opacity-40 hover:opacity-100"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Mini-Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Synchronized Records', value: reportData.length, icon: Database, color: 'text-brand-primary' },
          { label: 'Data Integrity', value: '100%', icon: CheckCircle2, color: 'text-brand-tertiary' },
          { label: 'Processing Delay', value: '0.4s', icon: Zap, color: 'text-brand-primary' },
          { label: 'Consensus Mode', value: 'Direct', icon: Share2, color: 'text-brand-tertiary' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-mid p-5 rounded-2xl border border-outline-variant/5 flex items-center gap-4 group hover:bg-surface-highest transition-all">
             <div className="w-10 h-10 rounded-xl bg-surface-highest/50 flex items-center justify-center">
                <stat.icon size={20} className={stat.color} />
             </div>
             <div>
                <p className="text-[10px] font-bold text-[#dae2fd] opacity-30 uppercase tracking-widest">{stat.label}</p>
                <div className="text-xl font-bold text-white">{stat.value}</div>
             </div>
          </div>
        ))}
      </div>

      {/* Main Table Interface */}
      <section className="bg-surface-mid rounded-2xl border border-outline-variant/10 overflow-hidden shadow-2xl">
        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-highest/20 border-b border-outline-variant/10 relative">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
             <h2 className="text-lg font-bold text-brand-primary font-headline">Consolidated Production Stream</h2>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#dae2fd] opacity-20" size={16} />
                <input 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                   className="w-full bg-surface-lowest border border-outline-variant/10 rounded-xl py-2.5 pl-12 pr-4 text-xs text-[#dae2fd] focus:ring-1 focus:ring-brand-primary transition-all placeholder:text-[#dae2fd]/20" 
                   placeholder="Search Serial, Batch or ID..." 
                   type="text"
                />
             </div>
             <button 
                onClick={fetchData} 
                className="p-2.5 bg-surface-highest/50 border border-outline-variant/10 rounded-xl text-[#dae2fd] hover:text-brand-primary transition-all active:scale-95"
             >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
             </button>
             <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-background-deep font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-95">
                <Download size={14} /> Export Report
             </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-highest/30">
                {visibleFields.map(field => (
                  <th key={field} className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#dae2fd] opacity-30">
                    {FIELD_LABELS[field] || field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                   <td colSpan={visibleFields.length} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                         <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                         <span className="text-[10px] font-bold text-[#dae2fd] opacity-20 uppercase tracking-widest">Compiling Unified Registry...</span>
                      </div>
                   </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                   <td colSpan={visibleFields.length} className="py-24 text-center text-[#dae2fd] opacity-20 italic text-sm">
                      No concurrent records detected in the specified cloud cluster.
                   </td>
                </tr>
              ) : reportData.map((row, i) => (
                <tr key={i} className="hover:bg-surface-highest/10 transition-colors group">
                  {visibleFields.map(field => {
                    const value = row[field];
                    
                    // Special styling for outcome
                    if (field === 'status_resultado') {
                       const isOk = ['Aprovado', 'APROVADO', 'OK'].includes(value);
                       return (
                         <td key={field} className="px-8 py-5">
                            <span className={cn(
                              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                              isOk ? "bg-brand-tertiary/10 text-brand-tertiary shadow-[0_0_8px_rgba(137,206,255,0.1)]" : "bg-brand-error/10 text-brand-error shadow-[0_0_8px_rgba(255,180,171,0.1)]"
                            )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full", isOk ? "bg-brand-tertiary" : "bg-brand-error")} />
                              {value}
                            </span>
                         </td>
                       );
                    }

                    if (field === 'meter_number') {
                       return <td key={field} className="px-8 py-5 font-mono text-sm font-bold text-brand-primary">{value}</td>;
                    }

                    if (field === 'data_hora') {
                       return (
                        <td key={field} className="px-8 py-5 text-xs text-[#dae2fd] opacity-40 tabular-nums">
                          {value ? format(new Date(value), 'yyyy-MM-dd HH:mm:ss') : '-'}
                        </td>
                       );
                    }

                    if (['temperatura_celcius', 'pressao_pa', 'umidade_percentual'].includes(field)) {
                        return (
                          <td key={field} className="px-8 py-5 text-xs font-bold text-white tracking-tight">
                            {value}{field === 'temperatura_celcius' ? '°C' : field === 'umidade_percentual' ? '%' : ' Pa'}
                          </td>
                        );
                    }

                    return (
                      <td key={field} className="px-8 py-5 text-xs text-[#dae2fd] opacity-60">
                        {value === null || value === undefined ? '-' : String(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Pagination Accent */}
        <div className="p-6 bg-surface-highest/20 border-t border-outline-variant/10 flex justify-between items-center text-[10px] font-bold text-[#dae2fd] opacity-40 uppercase tracking-[0.2em]">
           <div className="flex items-center gap-6">
              <span className="text-brand-primary">Archive State: Online</span>
              <span>Loaded 100 of {reportData.length >= 100 ? '100+' : reportData.length} records</span>
           </div>
           <div className="flex gap-4">
              <button className="flex items-center gap-1 hover:text-brand-primary transition-all disabled:opacity-5" disabled><ChevronLeft size={14} /> Previous Cluster</button>
              <button className="flex items-center gap-1 hover:text-brand-primary transition-all">Next Cluster <ChevronRight size={14} /></button>
           </div>
        </div>
      </section>

      {/* Decorative Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.02] blueprint-grid" />
    </div>
  );
}
