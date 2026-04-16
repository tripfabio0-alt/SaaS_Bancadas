"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Database, Search, Filter, Download, ArrowLeft, MoreVertical, RefreshCw, StickyNote, Hash } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const TABS = ['Data', 'Full Data', 'Consolidated'];
const PAGE_SIZE = 100;

type BenchStatus = 'Online' | 'Idle' | 'Offline';

function getBenchStatus(lastSyncAt: string | null): BenchStatus {
  if (!lastSyncAt) return 'Offline';
  const diffMinutes = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60);
  if (diffMinutes < 30) return 'Online';
  if (diffMinutes < 180) return 'Idle';
  return 'Offline';
}

export default function BenchDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Data');
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
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (data) {
        setVisibleFields(data.admin_settings?.visible_fields || []);
        const currentBench = data.benches_config?.find((b: any) => b.id === Number(id));
        if (currentBench) setBenchName(currentBench.name);
      }
    } catch (e) {
      console.error('Error fetching field config:', e);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(';')];
    for (const row of data) {
      csvRows.push(headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(';'));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bancada_${id}_${activeTab.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = data.filter(item => {
    const searchStr = searchTerm.toLowerCase();
    return Object.values(item).some(val => String(val).toLowerCase().includes(searchStr));
  });

  const fetchData = async (currentPage = page) => {
    setLoading(true);
    try {
      if (visibleFields.length === 0) await fetchConfig();
      
      const isConsolidated = activeTab === 'Consolidated';
      // MIGRATION: consolidated_data -> global_uniao
      const tableName = isConsolidated ? 'global_uniao' : (activeTab === 'Data' ? 'data' : 'full_data');
      const orderColumn = 'timestamp';
      
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const bancadaIdNum = Number(id);

      let query = supabase
        .from(tableName as any)
        .select('*', { count: 'exact' })
        .eq('bancada_id', bancadaIdNum)
        .order(orderColumn as any, { ascending: false })
        .range(from, to);

      const [{ data: result, error, count }, statusRes] = await Promise.all([
        query,
        supabase
          .from('data')
          .select('sync_at')
          .eq('bancada_id', bancadaIdNum)
          .order('sync_at', { ascending: false })
          .limit(1),
      ]);

      if (error) throw error;

      setData(result || []);
      setTotalCount(count || 0);
      setBenchStatus(getBenchStatus(statusRes.data?.[0]?.sync_at || null));
    } catch (err: any) {
      console.error('FETCH_BENCH_DETAILS_CRITICAL:', err);
      setData([]);
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <div className="space-y-8 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Link href="/" className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-white tracking-tighter">{benchName}</h1>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg",
                benchStatus === 'Online' ? "bg-green-500 text-black border-green-400" :
                benchStatus === 'Idle' ? "bg-yellow-500 text-black border-yellow-400" :
                "bg-red-500 text-white border-red-400"
              )}>{benchStatus}</span>
            </div>
            <p className="text-white/30 text-sm mt-1 uppercase tracking-widest font-bold text-[10px]">Industrial Data Node #{id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchData(page)}
            disabled={loading}
            className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/80 hover:bg-white/10 transition-all text-sm font-bold disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} /> {loading ? 'UPDATING...' : 'SYNC REFRESH'}
          </button>
          <button 
            onClick={exportToCSV}
            disabled={loading || data.length === 0}
            className="flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white transition-all text-sm font-bold shadow-lg shadow-blue-500/10"
          >
            <Download size={16} /> EXPORT CSV
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
              activeTab === tab 
                ? "bg-white text-black shadow-xl" 
                : "text-white/20 hover:text-white/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] p-4 rounded-[32px] border border-white/5">
        <div className="relative w-full md:w-[450px]">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input 
            type="text" 
            placeholder={`Deep search in ${activeTab}...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-sm focus:outline-none focus:border-blue-500/40 transition-all font-mono text-white/60"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/40 text-xs font-bold uppercase tracking-widest transition-all">
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      <div className="glass-card rounded-[40px] overflow-hidden border border-white/5 relative">
        <table className="w-full text-left">
          <thead className="border-b border-white/5 bg-white/[0.02]">
            <tr>
              <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">ID Mark</th>
              {activeTab === 'Data' ? (
                <>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Meter Number</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Conclusion</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Obs (Note)</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Save Time</th>
                </>
              ) : activeTab === 'Full Data' ? (
                <>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">JSON Payload</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Sync At</th>
                </>
              ) : (
                <>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Meter Name</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Lote (CSV)</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Tech Metrics</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Timestamp</th>
                </>
              )}
              <th className="px-8 py-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-8 py-32 text-center">
                   <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4 opacity-20" />
                   <p className="text-white/20 font-bold tracking-widest text-xs uppercase">Pulling Datastream...</p>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-white/10 italic">No records found.</td>
              </tr>
            ) : (
              filteredData.map((item: any, i: number) => (
                <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-8 py-5">
                    <span className="font-mono text-blue-400 font-bold">{item['ID Mark'] || item['id_mark'] || '-'}</span>
                  </td>
                  
                  {activeTab === 'Data' ? (
                    <>
                      <td className="px-8 py-5 text-white/60 font-bold">{item['Meter Number'] || '-'}</td>
                      <td className="px-8 py-5">
                         <span className={cn(
                             "px-2 py-0.5 rounded-md text-[10px] font-bold",
                             item['Error conclusion'] === 'Aprovado' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                         )}>
                           {item['Error conclusion'] || '-'}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-white/30 text-[10px]">
                         {item.note ? <div className="flex items-center gap-2"><StickyNote size={12} className="text-amber-500" /> {item.note}</div> : '-'}
                      </td>
                      <td className="px-8 py-5 text-white/20 text-[10px] font-mono">{item['Save time'] || '-'}</td>
                    </>
                  ) : activeTab === 'Full Data' ? (
                    <>
                      <td className="px-8 py-5">
                        <div className="bg-black/20 border border-white/5 rounded-xl p-3 font-mono text-[10px] text-white/40 max-w-sm truncate">
                          {JSON.stringify(item.raw_payload || item)}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-white/20 text-[10px] font-mono">
                        {new Date(item.sync_at).toLocaleString()}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-8 py-5 text-white/60 font-bold">{item['Meter Number'] || '-'}</td>
                      <td className="px-8 py-5">
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-bold border border-indigo-500/10">
                           {item.lote || 'No Link'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex gap-4 text-[10px] font-bold uppercase">
                           <span className="text-white/20">Point: <span className="text-white/60">{item.test_point || 'qmax'}</span></span>
                           <span className="text-white/20">Rate: <span className="text-white/60">{item.flow_rate || 'N/A'}</span></span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-white/20 text-[10px] font-mono">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                    </>
                  )}

                  <td className="px-8 py-5">
                    <button className="text-[10px] font-black uppercase text-white/10 group-hover:text-blue-400 transition-all tracking-widest">Detail View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="p-8 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
            {totalCount.toLocaleString()} Total Records • Page {page + 1}/{totalPages || 1}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={!hasPrev || loading}
              className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase transition-all disabled:opacity-20 text-white/60 hover:text-white"
            >Back</button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext || loading}
              className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase transition-all disabled:opacity-20 text-white/60 hover:text-white"
            >Load Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
