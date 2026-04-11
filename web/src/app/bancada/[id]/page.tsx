"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Database, Search, Filter, Download, ArrowLeft, MoreVertical, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const TABS = ['Data', 'Full Data'];

export default function BenchDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Data');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tableName = activeTab === 'Data' ? 'data' : 'full_data';
      const { data: result, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('bancada_id', Number(id))
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error('Erro ao buscar detalhes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, activeTab]);

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
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">Online</span>
            </div>
            <p className="text-white/40 text-sm mt-1">Detailed database records for monitoring and analysis.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/80 hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} /> {loading ? 'Syncing...' : 'Sync Now'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/80 hover:bg-white/10 transition-all text-sm font-medium">
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
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-white/20"
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
              <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Meter Number</th>
              <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Error conclusion</th>
              <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Save time</th>
              <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Sync Status</th>
              <th className="px-6 py-5 text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw size={24} className="text-blue-500 animate-spin" />
                    <p className="text-white/20 text-sm">Loading records from bench {id}...</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-white/20">
                  No records found for this bench.
                </td>
              </tr>
            ) : (
              data.map((item: any, i: number) => (
                <tr key={item.id || i} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-5">
                    <span className="font-mono text-blue-400">{item['ID Mark']}</span>
                  </td>
                  <td className="px-6 py-5 text-white/60 font-semibold">{item['Meter Number']}</td>
                  <td className="px-6 py-5 font-semibold">{item['Error conclusion']}</td>
                  <td className="px-6 py-5 text-white/40 text-sm italic">{item['Save time']}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-xs font-medium text-white/60">Synced</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <button className="text-xs font-bold text-white/20 group-hover:text-white/60 hover:!text-white transition-all underline decoration-white/0 underline-offset-4 hover:decoration-white/10">DETAILS</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Empty State / Pagination placeholder */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
          <p className="text-sm text-white/20">
            {loading ? 'Calculating...' : `Showing ${data.length} entries for this bench`}
          </p>
          <div className="flex gap-2">
            <button disabled className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-white/20 text-sm cursor-not-allowed">Previous</button>
            <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all text-sm">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
