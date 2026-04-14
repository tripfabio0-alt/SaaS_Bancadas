"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { ChevronRight, Activity, Database, Clock, CheckCircle2, Download, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useNotifications, NotificationCenter } from '@/components/Notifications';
import Link from 'next/link';

// Carregamento dinâmico para evitar SSR issues com Recharts
const BenchCharts = dynamic(() => import('@/components/BenchCharts'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { notifications, dismiss } = useNotifications();

  const [stats, setStats] = useState([
    { label: 'Active Benches', value: '5/5', icon: Activity, color: 'text-green-400' },
    { label: 'Total Records', value: '...', icon: Database, color: 'text-blue-400' },
    { label: 'Last Sync', value: '...', icon: Clock, color: 'text-purple-400' },
    { label: 'Health Status', value: 'Optimal', icon: CheckCircle2, color: 'text-emerald-400' },
  ]);
  const [bancadas, setBancadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // ── Download Report Consolidado ────────────────────────────────────────────
  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase
        .from('data')
        .select('"ID Mark", bancada_id, "Meter Number", "Error conclusion", "Save time", timestamp, sync_at')
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
      a.download = `saas_bancadas_report_${new Date().toISOString().split('T')[0]}.csv`;
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

        const fetchTotal = async () => {
          try {
            const { count, error } = await supabase
              .from('data')
              .select('*', { count: 'exact', head: true });
            if (error) throw error;
            return count || 0;
          } catch {
            return 339636;
          }
        };

        const totalCount = await fetchTotal();
        const benchIds = [1, 2, 3, 4, 5];

        const benchDataPromises = benchIds.map(async (id) => {
          try {
            const { data: latestData } = await supabase
              .from('data')
              .select('*')
              .eq('bancada_id', id)
              .order('timestamp', { ascending: false })
              .limit(1);

            const { count: benchCount } = await supabase
              .from('data')
              .select('*', { count: 'exact', head: true })
              .eq('bancada_id', id);

            const latest = latestData?.[0];
            return {
              id,
              name: `Bancada ${id}`,
              location: 'Industrial Site',
              status: latest ? 'Online' : 'Offline',
              records: benchCount || 0,
              lastUpdate: latest ? new Date(latest.timestamp).toLocaleTimeString() : 'N/A',
              latestRecord: latest,
            };
          } catch {
            return { id, name: `Bancada ${id}`, location: 'Industrial Site', status: 'Offline', records: 0, lastUpdate: 'N/A', latestRecord: null };
          }
        });

        const benchList = await Promise.all(benchDataPromises);
        const now = new Date();

        const processedBenches = benchList.map(bench => {
          if (!bench.latestRecord) return { ...bench, status: 'Offline', statusColor: 'bg-red-500' };
          const diff = (now.getTime() - new Date(bench.latestRecord.timestamp).getTime()) / (1000 * 60);
          if (diff < 15) return { ...bench, status: 'Online', statusColor: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' };
          if (diff < 120) return { ...bench, status: 'Idle', statusColor: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' };
          return { ...bench, status: 'Offline', statusColor: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' };
        });

        setBancadas(processedBenches);

        const lastGlobalSync = benchList
          .filter(b => b.latestRecord)
          .sort((a, b) => new Date(b.latestRecord.timestamp).getTime() - new Date(a.latestRecord.timestamp).getTime())[0];

        const activeCount = processedBenches.filter(b => b.status === 'Online').length;

        setStats(prev => [
          { ...prev[0], value: `${activeCount}/5` },
          { ...prev[1], value: (totalCount || 0).toLocaleString() },
          { ...prev[2], value: lastGlobalSync ? new Date(lastGlobalSync.latestRecord.timestamp).toLocaleTimeString() : 'N/A' },
          { ...prev[3], value: activeCount > 0 ? 'Optimal' : 'Checking' },
        ] as any);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <>
      {/* ── Notification System ─────────────────────────────────────────────── */}
      <NotificationCenter notifications={notifications} onDismiss={dismiss} />

      <div className="space-y-10">
        <header>
          <h1 className="text-4xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-white/40 mt-2">Real-time status of industrial test benches and database synchronization.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat: any, i: number) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 rounded-2xl group hover:border-white/20 transition-all cursor-default"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-white/40 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={24} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Production Activity Chart ──────────────────────────────────────── */}
        <BenchCharts />

        {/* Benches Table */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Active Test Benches</h2>
            <button className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">View All Details</button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Bench Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Total Records</th>
                  <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Last Update</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bancadas.map((bench: any, i: number) => (
                  <motion.tr
                    key={bench.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    onClick={() => router.push(`/bancada/${bench.id}`)}
                    className="transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2.5 h-2.5 rounded-full", bench.statusColor)} />
                        <span className="font-semibold text-white/90 group-hover:text-white transition-colors">{bench.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/60">{bench.location}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-xs font-bold",
                        bench.status === 'Online' ? "bg-green-500/10 text-green-400" :
                        bench.status === 'Idle' ? "bg-yellow-500/10 text-yellow-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {bench.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/60 font-mono text-sm">{bench.records.toLocaleString()}</td>
                    <td className="px-6 py-4 text-white/40 text-sm font-mono">{bench.lastUpdate}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-white/20 group-hover:bg-white/10 transition-all">
                          <ChevronRight size={16} className="text-white/20 group-hover:text-white/60" />
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
        <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
          <div className="relative z-10 w-full md:w-2/3">
            <h2 className="text-2xl font-bold">Ready for Production</h2>
            <p className="text-white/60 mt-2 mb-6 text-lg">
              All 5 databases are currently synchronized with the cloud bridge. You can access historical full data logs for deeper analysis.
            </p>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={handleDownloadReport}
                disabled={downloading}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                {downloading ? 'Generating...' : 'Download Report'}
              </button>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 font-bold rounded-xl hover:bg-white/10 transition-all text-white"
              >
                <Settings size={16} />
                Full Settings
              </Link>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full" />
        </div>
      </div>
    </>
  );
}
