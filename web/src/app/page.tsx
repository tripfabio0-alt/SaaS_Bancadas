"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { ChevronRight, Activity, Clock, CheckCircle2, Download, Settings, Layers, Box, Search, Hash, StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useNotifications, NotificationCenter } from '@/components/Notifications';
import Link from 'next/link';

// Carregamento dinâmico para evitar SSR issues com Recharts
const BenchCharts = dynamic(() => import('@/components/BenchCharts'), { ssr: false });

interface BenchConfig {
  id: number;
  name: string;
}

export default function Home() {
  const router = useRouter();
  const { notifications, dismiss } = useNotifications();

  const [stats, setStats] = useState([
    { label: 'Cloud Stream', value: 'Live', icon: Activity, color: 'text-emerald-400' },
    { label: 'Total Records', value: '...', icon: Layers, color: 'text-blue-400' },
    { label: 'Last Sync', value: '...', icon: Clock, color: 'text-purple-400' },
    { label: 'Active Lotes', value: '...', icon: Box, color: 'text-amber-400' },
  ]);
  
  const [bancadas, setBancadas] = useState<any[]>([]);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // ── Fetch Dashboard Data ───────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Configuração de Bancadas
      const { data: configData } = await supabase.from('app_config').select('*').eq('id', 1).single();
      const configBenches = (configData?.benches_config || []) as BenchConfig[];

      // 2. Registros Recentes da União Global (O FOCO)
      const { data: unionData } = await supabase
        .from('global_uniao')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      setRecentRecords(unionData || []);

      // 3. Estatísticas rápidas
      const { count: totalCount } = await supabase.from('data').select('*', { count: 'exact', head: true });
      const { data: recentSync } = await supabase.from('data').select('sync_at').order('sync_at', { ascending: false }).limit(1);
      
      // Contagem de Lotes únicos (extraído do CSV synchronizado)
      const { data: lotesData } = await supabase.from('vinculo_lacre').select('lote_produto', { count: 'exact', head: false });
      const uniqueLotes = new Set(lotesData?.map(l => l.lote_produto)).size;

      // 4. Status de Saúde das Bancadas (Secundário)
      const benchDataPromises = configBenches.map(async (bench) => {
        const { data: latest } = await supabase.from('data').select('sync_at').eq('bancada_id', bench.id).order('sync_at', { ascending: false }).limit(1);
        const diff = latest?.[0] ? (Date.now() - new Date(latest[0].sync_at).getTime()) / (1000 * 60) : 9999;
        return {
          ...bench,
          status: diff < 30 ? 'Online' : diff < 180 ? 'Idle' : 'Offline',
          statusColor: diff < 30 ? 'bg-emerald-500' : diff < 180 ? 'bg-amber-500' : 'bg-red-500'
        };
      });
      const resolvedBenches = await Promise.all(benchDataPromises);
      setBancadas(resolvedBenches);

      setStats([
        { label: 'Cloud Stream', value: 'Live', icon: Activity, color: 'text-emerald-400' },
        { label: 'Total Records', value: (totalCount || 0).toLocaleString(), icon: Layers, color: 'text-blue-400' },
        { label: 'Last Sync', value: recentSync?.[0] ? new Date(recentSync[0].sync_at).toLocaleTimeString() : 'N/A', icon: Clock, color: 'text-purple-400' },
        { label: 'Active Lotes', value: uniqueLotes.toString(), icon: Box, color: 'text-amber-400' },
      ]);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-union').on('postgres_changes', { event: '*', schema: 'public', table: 'data' }, fetchData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <>
      <NotificationCenter notifications={notifications} onDismiss={dismiss} />

      <div className="space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tighter">Universal Dashboard</h1>
            <p className="text-white/40 mt-2 font-medium tracking-wide border-l-2 border-blue-500/20 pl-4">
              Real-time synchronization of <span className="text-blue-400">bench databases</span> and <span className="text-emerald-400">third-party batches</span>.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Link href="/reports" className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-sm font-bold text-white">
               <Layers size={16} /> Global View
             </Link>
             <Link href="/settings" className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-white/40 hover:text-white">
                <Settings size={20} />
             </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="glass-card p-6 rounded-[32px] group hover:border-white/20 transition-all border border-white/5"
            >
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">{stat.label}</p>
              <div className="flex justify-between items-end">
                <h3 className="text-3xl font-bold font-mono tracking-tighter">{stat.value}</h3>
                <div className={cn("p-2 rounded-xl bg-white/5", stat.color)}>
                  <stat.icon size={18} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── CENTRAL: UNIFIED PRODUCTION FEED ─────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Unified Global Stream
              </h2>
              <Link href="/reports" className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-all">
                Full Database <ChevronRight size={14} className="inline ml-1" />
              </Link>
            </div>

            <div className="glass-card rounded-[40px] overflow-hidden border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.15em]">Lote</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.15em]">Medidor</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.15em]">Resultado</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.15em]">Obs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-white/10 animate-pulse italic">Pulsing data...</td></tr>
                  ) : recentRecords.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-white/10 italic">Waiting for incoming cloud sync...</td></tr>
                  ) : (
                    recentRecords.map((row, i) => (
                      <motion.tr 
                        key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="group hover:bg-white/[0.01] transition-colors"
                      >
                        <td className="px-8 py-5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                            row.lote ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/10" : "bg-white/5 text-white/20 border-transparent"
                          )}>
                            {row.lote || 'N/A'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{row['Meter Number']}</span>
                            <span className="text-[10px] text-white/20">Mark: {row['ID Mark']}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            row['Error conclusion'] === 'Aprovado' ? "text-emerald-400" : "text-red-400"
                          )}>
                            {row['Error conclusion']}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                           {row.note ? (
                             <div className="flex items-center gap-2 text-white/30 truncate max-w-[100px]">
                               <StickyNote size={12} className="text-amber-500/50" />
                               <span className="text-[10px]">{row.note}</span>
                             </div>
                           ) : <span className="text-white/5">-</span>}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-8">
            {/* Benches Health Section (Secondary) */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white/60 px-2 uppercase tracking-widest text-[12px]">Node Infrastructure</h2>
              <div className="space-y-3">
                {bancadas.map(bench => (
                  <motion.div
                    key={bench.id}
                    onClick={() => router.push(`/bancada/${bench.id}`)}
                    className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-2 h-2 rounded-full", bench.statusColor)} />
                      <span className="font-bold text-white/80 group-hover:text-white transition-colors">{bench.name}</span>
                    </div>
                    <ChevronRight size={14} className="text-white/10 group-hover:text-white/40 transition-all" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Performance Visualization */}
            <div className="glass-card p-6 rounded-[32px] border border-white/5 bg-gradient-to-br from-indigo-500/[0.05] to-transparent">
               <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Volume Overview</h3>
               <div className="h-48">
                  <BenchCharts />
               </div>
            </div>
          </div>
        </section>

        {/* Global Action Card */}
        <div className="glass-card p-10 rounded-[40px] relative overflow-hidden border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Export Full Consolidated Analytics</h2>
              <p className="text-white/40 text-lg leading-relaxed">
                Download the complete dataset containing joined industrial logs and third-party batch relationships. 
                Compatible with BI tools and Excel.
              </p>
            </div>
            <button
               onClick={() => router.push('/reports')}
               className="px-10 py-5 bg-white text-black font-black rounded-[24px] hover:bg-blue-50 transition-all shadow-xl hover:shadow-white/10 flex items-center gap-3 whitespace-nowrap"
            >
              <Download size={20} /> GENERATE FULL REPORT
            </button>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full -mr-20 -mt-20 animate-pulse" />
        </div>
      </div>
    </>
  );
}
