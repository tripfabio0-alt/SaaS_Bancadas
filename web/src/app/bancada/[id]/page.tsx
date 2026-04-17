"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Download, 
  ArrowLeft, 
  RefreshCw, 
  StickyNote, 
  Layers,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

const TABS = ['Consolidated Data', 'Primary Logs', 'Technical Payload'];
const PAGE_SIZE = 100;

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
  'id_mark_bancada': 'Node ID Mark'
};

type BenchStatus = 'Online' | 'Idle' | 'Offline';

export default function BenchDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Consolidated Data');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [benchStatus, setBenchStatus] = useState<BenchStatus>('Offline');
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [benchName, setBenchName] = useState(`Bancada ${id}`);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase.from('app_config').select('*').eq('id', 1).single();
      if (data) {
        setVisibleFields(data.admin_settings?.visible_fields || ['meter_number', 'lote_produto', 'status_resultado', 'data_hora']);
        const currentBench = data.benches_config?.find((b: any) => b.id === Number(id));
        if (currentBench) setBenchName(currentBench.name);
      }
    } catch (e) { console.error(e); }
  };

  const fetchData = async (currentPage = page) => {
    setLoading(true);
    try {
      if (visibleFields.length === 0) await fetchConfig();
      
      const tableName = activeTab === 'Consolidated Data' ? 'global_uniao' : (activeTab === 'Primary Logs' ? 'data' : 'full_data');
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const [{ data: result, count }, statusRes] = await Promise.all([
        supabase
          .from(tableName as any)
          .select('*', { count: 'exact' })
          .eq('bancada_id', Number(id))
          .order('timestamp' as any, { ascending: false })
          .range(from, to),
        supabase
          .from('data')
          .select('sync_at')
          .eq('bancada_id', Number(id))
          .order('sync_at', { ascending: false })
          .limit(1)
      ]);

      setData(result || []);
      setTotalCount(count || 0);
      
      const lastSync = statusRes.data?.[0]?.sync_at;
      if (lastSync) {
         const diff = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60);
         setBenchStatus(diff < 30 ? 'Online' : diff < 180 ? 'Idle' : 'Offline');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchData(0);
  }, [id, activeTab]);

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const filteredData = data.filter(item => {
    const s = searchTerm.toLowerCase();
    return Object.values(item).some(v => String(v).toLowerCase().includes(s));
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header with Navigation and Node Status */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-outline-variant/10 pb-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="w-12 h-12 rounded-xl bg-surface-mid border border-outline-variant/10 flex items-center justify-center text-[#dae2fd] opacity-40 hover:opacity-100 hover:bg-surface-highest transition-all group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight">{benchName}</h1>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg",
                benchStatus === 'Online' ? "bg-brand-tertiary/10 text-brand-tertiary border-brand-tertiary/20" :
                benchStatus === 'Idle' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                "bg-brand-error/10 text-brand-error border-brand-error/20"
              )}>{benchStatus} Protocol</span>
            </div>
            <p className="text-[#dae2fd] opacity-40 text-[10px] font-bold uppercase tracking-widest mt-2">
              Industrial Node Clustering #0{id} — Latency Managed
            </p>
          </div>
        </div>

        <div className="flex gap-3">
           <button onClick={() => fetchData(page)} className="bg-surface-mid border border-outline-variant/10 text-[#dae2fd] text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-3 hover:bg-surface-highest transition-all">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> REFRESH
           </button>
           <button className="machined-gradient text-white font-extrabold text-[10px] tracking-widest uppercase px-8 py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2">
              <Download size={14} /> EXPORT NODE LOG
           </button>
        </div>
      </header>

      {/* Tabs and Filtering */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="p-1.5 bg-surface-mid border border-outline-variant/10 rounded-2xl flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === tab ? "bg-surface-highest text-brand-primary shadow-lg" : "text-[#dae2fd] opacity-40 hover:opacity-100"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#dae2fd] opacity-20" size={16} />
          <input 
            type="text" 
            placeholder="Search within node datastream..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-mid border border-outline-variant/10 rounded-xl py-3 pl-12 pr-4 text-xs text-[#dae2fd] focus:ring-1 focus:ring-brand-primary transition-all placeholder:text-[#dae2fd]/20"
          />
        </div>
      </div>

      {/* High-Fidelity Data Table */}
      <section className="bg-surface-mid rounded-2xl border border-outline-variant/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-highest/30">
                {activeTab === 'Consolidated Data' ? (
                   visibleFields.map(f => (
                    <th key={f} className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">
                      {FIELD_LABELS[f] || f}
                    </th>
                   ))
                ) : activeTab === 'Primary Logs' ? (
                  <>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">Meter Serial</th>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">Conclusion Status</th>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">Lab Record Time</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">ID Mark / Anchor</th>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">JSON Industrial Payload</th>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">Cloud Sync Timestamp</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                   <td colSpan={10} className="py-32 text-center text-[#dae2fd] opacity-20 italic">
                      <div className="flex flex-col items-center gap-4">
                         <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Opening Secure Stream Port...</span>
                      </div>
                   </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                   <td colSpan={10} className="py-24 text-center text-[#dae2fd] opacity-20 italic text-sm">
                      No matching records detected in this node's registry.
                   </td>
                </tr>
              ) : filteredData.map((row, i) => (
                <tr key={i} className="hover:bg-surface-highest/10 transition-colors group">
                  {activeTab === 'Consolidated Data' ? (
                    visibleFields.map(field => {
                      const value = row[field];
                      if (field === 'status_resultado') {
                        const isOk = ['Aprovado', 'APROVADO', 'OK'].includes(value);
                        return (
                          <td key={field} className="px-8 py-5">
                            <span className={cn(
                              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                              isOk ? "bg-brand-tertiary/10 text-brand-tertiary" : "bg-brand-error/10 text-brand-error"
                            )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full", isOk ? "bg-brand-tertiary" : "bg-brand-error")} />
                              {value}
                            </span>
                          </td>
                        );
                      }
                      if (field === 'data_hora') return <td key={field} className="px-8 py-5 text-xs text-[#dae2fd] opacity-40 tabular-nums">{value ? format(new Date(value), 'yyyy-MM-dd HH:mm:ss') : '-'}</td>;
                      if (field === 'meter_number') return <td key={field} className="px-8 py-5 font-mono text-sm font-bold text-brand-primary">{value}</td>;
                      
                      return <td key={field} className="px-8 py-5 text-xs text-[#dae2fd] opacity-60">{value === null || value === undefined ? '-' : String(value)}</td>;
                    })
                  ) : activeTab === 'Primary Logs' ? (
                    <>
                       <td className="px-8 py-5 font-mono text-sm font-bold text-brand-primary">{row['Meter Number'] || row.meter_number}</td>
                       <td className="px-8 py-5">
                          <span className={cn(
                             "px-3 py-1 rounded-lg text-[10px] font-bold uppercase",
                             (row['Error conclusion'] || row.status_resultado) === 'Aprovado' ? "bg-brand-tertiary/10 text-brand-tertiary" : "bg-brand-error/10 text-brand-error"
                          )}>{row['Error conclusion'] || row.status_resultado || 'N/A'}</span>
                       </td>
                       <td className="px-8 py-5 text-xs text-[#dae2fd] opacity-30 tabular-nums">{row['Save time'] || format(new Date(row.timestamp), 'yyyy-MM-dd HH:mm:ss')}</td>
                    </>
                  ) : (
                    <>
                       <td className="px-8 py-5 font-mono text-xs font-bold text-brand-primary">{row['ID Mark'] || row.composite_id}</td>
                       <td className="px-8 py-5">
                           <div className="bg-surface-lowest p-3 border border-outline-variant/10 rounded-xl max-w-sm truncate text-[10px] font-mono text-[#dae2fd] opacity-40 group-hover:opacity-100 transition-opacity">
                              {JSON.stringify(row.raw_payload || row)}
                           </div>
                       </td>
                       <td className="px-8 py-5 text-xs text-[#dae2fd] opacity-30 tabular-nums">{format(new Date(row.sync_at), 'yyyy-MM-dd HH:mm:ss')}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Pagination Accent */}
        <div className="p-6 bg-surface-highest/20 border-t border-outline-variant/10 flex justify-between items-center text-[10px] font-bold text-[#dae2fd] opacity-40 uppercase tracking-[0.2em]">
           <div className="flex items-center gap-6">
              <span className="text-brand-tertiary">Real-time Node Pooling: High</span>
              <span>Loaded {data.length} records</span>
           </div>
           <div className="flex gap-4">
              <button 
                onClick={() => setPage(p => p - 1)} disabled={page === 0}
                className="flex items-center gap-1 hover:text-brand-primary transition-all disabled:opacity-5"
              ><ChevronLeft size={14} /> Back</button>
              <button 
                onClick={() => setPage(p => p + 1)} disabled={data.length < PAGE_SIZE}
                className="flex items-center gap-1 hover:text-brand-primary transition-all disabled:opacity-5"
              >Next Cluster <ChevronRight size={14} /></button>
           </div>
        </div>
      </section>

      {/* Decorative Blueprint Accent */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.02] blueprint-grid" />
    </div>
  );
}
