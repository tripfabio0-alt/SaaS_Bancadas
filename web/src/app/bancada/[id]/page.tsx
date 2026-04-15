"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Database, Search, Filter, Download, ArrowLeft, MoreVertical, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const TABS = ['Data', 'Full Data'];
const PAGE_SIZE = 100;

type BenchStatus = 'Online' | 'Idle' | 'Offline';

function getBenchStatus(lastSyncAt: string | null): BenchStatus {
  if (!lastSyncAt) return 'Offline';
  // Comparar sync_at (quando foi sincronizado) e NÃO o timestamp original do dado
  const diffMinutes = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60);
  if (diffMinutes < 15) return 'Online';
  if (diffMinutes < 120) return 'Idle';
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

  const exportToCSV = () => {
    if (data.length === 0) return;
    
    // Pegar todas as chaves únicas presentes nos dados
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Header
    csvRows.push(headers.join(';')); // Usando ponto e vírgula para compatibilidade com Excel BR
    
    // Data
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(';'));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bancada_${id}_${activeTab.toLowerCase().replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.csv`);
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
      const tableName = activeTab === 'Data' ? 'data' : 'full_data';
      const orderColumn = activeTab === 'Data' ? 'timestamp' : 'sync_at';
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Garantir que ID seja um número se a coluna for integer
      const bancadaIdNum = Number(id);

      const [{ data: result, error, count }, statusRes] = await Promise.all([
        supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .eq('bancada_id', bancadaIdNum)
          .order(orderColumn, { ascending: false })
          .range(from, to),
        supabase
          .from('data')
          .select('sync_at')
          .eq('bancada_id', bancadaIdNum)
          .order('sync_at', { ascending: false })
          .limit(1),
      ]);

      if (error) {
        console.error(`ERROR_FETCHING_${tableName.toUpperCase()}:`, error);
        throw error;
      }

      setData(result || []);
      setTotalCount(count || 0);

      const latest = statusRes.data?.[0];
      setBenchStatus(getBenchStatus(latest?.sync_at ?? null));
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
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Bancada {id}</h1>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                benchStatus === 'Online' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                benchStatus === 'Idle' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                "bg-red-500/10 text-red-400 border-red-500/20"
              )}>{benchStatus}</span>
            </div>
            <p className="text-white/40 text-sm mt-1">Detailed database records for monitoring and analysis.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchData(page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/80 hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} /> {loading ? 'Syncing...' : 'Sync Now'}
          </button>
          <button 
            onClick={exportToCSV}
            disabled={loading || data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-all text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              activeTab === tab 
                ? "bg-white text-black shadow-lg" 
                : "text-white/40 hover:text-white/60"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input 
            type="text" 
            placeholder={`Search in ${activeTab}...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-white/20 text-white"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:text-white transition-all text-sm">
            <Filter size={16} /> Filters
          </button>
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:text-white transition-all">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Data Table Mockup */}
      <div className="glass-card rounded-3xl overflow-hidden min-h-[500px] border border-white/5 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        <table className="w-full text-left relative z-10">
          <thead className="border-b border-white/5">
            <tr>
              <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">ID Mark</th>
              {activeTab === 'Data' ? (
                <>
                  <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Meter Number</th>
                  <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Error conclusion</th>
                  <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Save time</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Technical Data (JSON)</th>
                  <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Captured At</th>
                </>
              )}
              <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Sync Status</th>
              <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full animate-pulse" />
                    </div>
                    <p className="text-white/40 text-sm font-medium tracking-wide">Retrieving secure bench data...</p>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-white/20">
                    <Database size={40} strokeWidth={1} />
                    <p>No records match your search.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item: any, i: number) => (
                <tr key={item.id || i} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-5">
                    <span className="font-mono text-blue-400">
                      {item['ID Mark'] || item['id_mark'] || item['id mark'] || '-'}
                    </span>
                  </td>
                  
                  {activeTab === 'Data' ? (
                    <>
                      <td className="px-6 py-5 text-white/60 font-semibold">
                        {item['Meter Number'] || item['meter_number'] || item['meter number'] || '-'}
                      </td>
                      <td className="px-6 py-5 font-semibold text-white/80">
                        {item['Error conclusion'] || item['error_conclusion'] || item['error conclusion'] || '-'}
                      </td>
                      <td className="px-6 py-5 text-white/40 text-sm italic">
                        {item['Save time'] || item['save_time'] || item['save time'] || '-'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-5">
                        <div className="max-w-md">
                          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 font-mono text-[11px] leading-relaxed group-hover:bg-white/[0.05] transition-colors overflow-hidden">
                            <span className="text-blue-400">{'{'}</span>
                            <div className="pl-4">
                              {(() => {
                                try {
                                  const payload = typeof item.raw_payload === 'string' 
                                    ? JSON.parse(item.raw_payload) 
                                    : item.raw_payload;
                                  
                                  // Pegar apenas as primeiras 4 chaves para manter compacto
                                  const keys = Object.keys(payload);
                                  const preview = keys.slice(0, 4).map(k => (
                                    <div key={k} className="truncate">
                                      <span className="text-white/40">"{k}":</span>{" "}
                                      <span className="text-emerald-400">"{String(payload[k])}"</span>
                                    </div>
                                  ));
                                  return (
                                    <>
                                      {preview}
                                      {keys.length > 4 && <div className="text-white/20 italic mt-1">... and {keys.length - 4} more fields</div>}
                                    </>
                                  );
                                } catch (e) {
                                  return <span className="text-red-400/60">JSON Parse Error</span>;
                                }
                              })()}
                            </div>
                            <span className="text-blue-400">{'}'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-white/40 text-sm font-mono">
                        {item['timestamp'] ? new Date(item['timestamp']).toLocaleString() : '-'}
                      </td>
                    </>
                  )}

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                      <span className="text-xs font-medium text-white/60">Synced</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <button className="text-xs font-bold text-white/20 group-hover:text-white/60 hover:!text-white transition-all underline decoration-white/0 underline-offset-4 hover:decoration-white/10 uppercase tracking-tighter">View Raw</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Empty State / Pagination placeholder */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
          <p className="text-sm text-white/20">
            {loading ? 'Calculating...' : `Showing ${data.length} of ${totalCount.toLocaleString()} records — Page ${page + 1} of ${totalPages || 1}`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={!hasPrev || loading}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-sm transition-all disabled:text-white/20 disabled:cursor-not-allowed text-white/60 enabled:hover:text-white enabled:hover:bg-white/10"
            >Previous</button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext || loading}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm transition-all disabled:text-white/20 disabled:cursor-not-allowed text-white/60 enabled:hover:text-white enabled:hover:bg-white/10"
            >Next Page</button>
          </div>
        </div>
      </div>
    </div>
  );
}
