"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { ChevronRight, Activity, Database, Clock, CheckCircle2, Download, Settings, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
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
    { label: 'Active Benches', value: '...', icon: Activity, color: 'text-green-400' },
    { label: 'Total Records', value: '...', icon: Layers, color: 'text-blue-400' },
    { label: 'Last Sync', value: '...', icon: Clock, color: 'text-purple-400' },
    { label: 'Health Status', value: 'Checking', icon: CheckCircle2, color: 'text-emerald-400' },
  ]);
  const [bancadas, setBancadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // ── Download Report Consolidado ────────────────────────────────────────────
  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase
        .from('global_uniao')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10000);

      if (error) throw error;
      if (!data || data.length === 0) return;

      const headers = Object.keys(data[0]);
      const rows = [
        headers.join(';'),
        ...data.map(row =>
          headers.map(h => {
            const v = (row as any)[h];
            return `"${String(v ?? '').replace(/"/g, '""')}"`;
          }).join(';')
        ),
      ];

      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saas_bancadas_universal_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao exportar relatório:', e);
    } finally {
      setDownloading(false);
    }
  };

  // ── Fetch Dashboard Data ───────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // 1. Buscar Configuração de Bancadas
        const { data: configData } = await supabase
          .from('app_config')
          .select('benches_config')
          .eq('id', 1)
          .single();
        
        const configBenches = (configData?.benches_config || []) as BenchConfig[];

        // 2. Buscar Total de Registros (View Global)
        const fetchTotal = async () => {
            const { count } = await supabase
              .from('data')
              .select('*', { count: 'exact', head: true });
            return count || 0;
        };
        const totalCount = await fetchTotal();

        // 3. Buscar Dados de cada Bancada Dinamicamente
        const benchDataPromises = configBenches.map(async (bench) => {
          try {
            const { data: latestData } = await supabase
              .from('data')
              .select('sync_at')
              .eq('bancada_id', bench.id)
              .order('sync_at', { ascending: false })
              .limit(1);

            const { count: benchCount } = await supabase
              .from('data')
              .select('*', { count: 'exact', head: true })
              .eq('bancada_id', bench.id);

            const latest = latestData?.[0];
            return {
              ...bench,
              location: 'Industrial Plant',
              status: latest ? 'Online' : 'Offline',
              records: benchCount || 0,
              lastUpdate: latest ? new Date(latest.sync_at).toLocaleTimeString() : 'N/A',
              latestRecord: latest,
            };
          } catch {
            return { ...bench, location: 'Industrial Plant', status: 'Offline', records: 0, lastUpdate: 'N/A', latestRecord: null };
          }
        });

        const benchList = await Promise.all(benchDataPromises);
        const now = new Date();

        const processedBenches = benchList.map(bench => {
          if (!bench.latestRecord) return { ...bench, status: 'Offline', statusColor: 'bg-red-500' };
          const diff = (now.getTime() - new Date(bench.latestRecord.sync_at).getTime()) / (1000 * 60);
          if (diff < 30) return { ...bench, status: 'Online', statusColor: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' };
          if (diff < 180) return { ...bench, status: 'Idle', statusColor: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' };
          return { ...bench, status: 'Offline', statusColor: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' };
        });

        setBancadas(processedBenches);

        const lastGlobalSync = benchList
          .filter(b => b.latestRecord)
          .sort((a, b) => new Date(b.latestRecord?.sync_at ?? 0).getTime() - new Date(a.latestRecord?.sync_at ?? 0).getTime())[0];

        const activeCount = processedBenches.filter(b => b.status === 'Online').length;

        setStats([
          { label: 'Active Benches', value: `${activeCount}/${configBenches.length}`, icon: Activity, color: 'text-green-400' },
          { label: 'Total Unified', value: totalCount.toLocaleString(), icon: Layers, color: 'text-blue-400' },
          { label: 'Last Sync', value: lastGlobalSync ? new Date(lastGlobalSync.latestRecord?.sync_at ?? 0).toLocaleTimeString() : 'N/A', icon: Clock, color: 'text-purple-400' },
          { label: 'System Health', value: 'Optimal', icon: CheckCircle2, color: 'text-emerald-400' },
        ] as any);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <>
      <NotificationCenter notifications={notifications} onDismiss={dismiss} />

      <div className="space-y-10">
        <header>
          <h1 className="text-4xl font-bold text-white tracking-tight">Industrial Overview</h1>
          <p className="text-white/40 mt-2">Unified monitoring for dynamic benches and partitioned databases.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat: any, i: number) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 rounded-3xl group hover:border-white/20 transition-all cursor-default"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{stat.label}</p>
                  <h3 className="text-3xl font-bold mt-2 font-mono tracking-tighter">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-2xl bg-white/5 ${stat.color} group-hover:scale-110 transition-all duration-500`}>
                  <stat.icon size={20} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Production Activity Chart ──────────────────────────────────────── */}
        <BenchCharts />

        {/* Benches Table */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-bold text-white">Configured Test Benches</h2>
            <Link href="/settings" className="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
               Manage Benches <ChevronRight size={14} />
            </Link>
          </div>

          <div className="glass-card rounded-[32px] overflow-hidden border border-white/5">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-8 py-5 text-[10px] font-bold text-white/20 uppercase tracking-widest">Bench Name</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-white/20 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-white/20 uppercase tracking-widest">Global Records</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-white/20 uppercase tracking-widest">Last Activity</th>
                  <th className="px-8 py-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bancadas.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="py-12 text-center text-white/10 italic">No benches configured. Go to Settings to add one.</td>
                    </tr>
                ) : bancadas.map((bench: any, i: number) => (
                  <motion.tr
                    key={bench.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    onClick={() => router.push(`/bancada/${bench.id}`)}
                    className="transition-colors cursor-pointer group hover:bg-white/[0.02]"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-3 h-3 rounded-full", bench.statusColor)} />
                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{bench.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                        bench.status === 'Online' ? "bg-green-500 text-black" :
                        bench.status === 'Idle' ? "bg-yellow-500 text-black" :
                        "bg-red-500 text-white"
                      )}>
                        {bench.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-white/50 font-mono text-sm">{bench.records.toLocaleString()}</td>
                    <td className="px-8 py-5 text-white/20 text-xs font-mono">{bench.lastUpdate}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-blue-500/20 group-hover:bg-blue-500/10 transition-all">
                          <ChevronRight size={16} className="text-white/20 group-hover:text-blue-400" />
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* System Health Card */}
        <div className="glass-card p-10 rounded-[40px] relative overflow-hidden border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="relative z-10 w-full md:w-2/3">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex -space-x-2">
                    {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-blue-500" />)}
                </div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Enterprise Ready</span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Advanced Industrial Integration</h2>
            <p className="text-white/40 mt-4 mb-8 text-lg leading-relaxed">
              Your SaaS is now operating on the <b>Universal Architecture v1.7</b>. 
              Multiple database partitions are being consolidated in real-time, matching test results with batch information from your local CSV automatically.
            </p>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={handleDownloadReport}
                disabled={downloading}
                className="flex items-center gap-3 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-blue-50 transition-all disabled:opacity-60 shadow-xl hover:shadow-white/10"
              >
                <Download size={18} />
                {downloading ? 'PROCESSING...' : 'EXPORT UNIFIED DATA'}
              </button>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 font-bold rounded-2xl hover:bg-white/10 transition-all text-white"
              >
                <Settings size={18} />
                SYSTEM CONSOLE
              </Link>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full -mr-20 -mt-20 animate-pulse" />
          <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-indigo-600/10 blur-[120px] rounded-full" />
        </div>
      </div>
    </>
  );
}
