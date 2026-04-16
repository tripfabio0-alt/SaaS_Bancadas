"use client";

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Download, 
  Calendar, 
  Clock, 
  Database, 
  ArrowUpRight, 
  Timer, 
  Hash,
  Filter,
  RefreshCw,
  BarChart3,
  StickyNote,
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

const PERIODS = ['Past 24h', 'Past 30 Days', 'Past Year', 'Custom'];
const REPORT_TYPES = [
  { id: 'history', name: 'Global Union History', icon: Layers },
  { id: 'uptime', name: 'Bench Productivity', icon: Timer },
  { id: 'models', name: 'Equipment Models', icon: BarChart3 }
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('history');
  const [activePeriod, setActivePeriod] = useState('Past 30 Days');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLote, setSearchLote] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTests: 0,
    avgTestTime: '18 min',
    totalUptime: '84.2%',
    activeBenches: 0
  });

  const [visibleFields, setVisibleFields] = useState<string[]>([]);

  const FIELD_LABELS: Record<string, string> = {
    'meter_number': 'Meter Serial',
    'lote_produto': 'Lote (CSV)',
    'lacre': 'Lacre',
    'status_resultado': 'Status',
    'observacao': 'Notes',
    'data_hora': 'Test Time',
    'id_mark_bancada': 'ID Mark',
    'data_access': 'Access Save',
    'cod_lacre': 'Cod. Lacre',
    'seq_lote': 'Seq. Lote',
    'csv_data_vinculo': 'Vinc. Date',
    'csv_tipo': 'CSV Type',
    'cod_inmetro': 'Cod. Inmetro',
    'lote_inmetro': 'Lote Inmetro',
    'ponto_teste': 'Test Pt',
    'vazao_real': 'Flow Rate',
    'erro_relativo': 'Rel. Error',
    'temperatura_celcius': 'Temp °C',
    'pressao_pa': 'Press Pa',
    'status_tecnico': 'Tech Status'
  };

  const fetchConfig = async () => {
    const { data } = await supabase.from('app_config').select('admin_settings').eq('id', 1).single();
    if (data?.admin_settings?.visible_fields) {
      setVisibleFields(data.admin_settings.visible_fields);
    } else {
      setVisibleFields(['meter_number', 'lote_produto', 'lacre', 'status_resultado', 'data_hora']);
    }
  };

  const fetchGlobalHistory = async () => {
    setLoading(true);
    try {
      await fetchConfig();
      let query = supabase.from('global_uniao').select('*');
      
      if (searchTerm) query = query.ilike('meter_number', `%${searchTerm}%`);
      if (searchLote) query = query.ilike('lote_produto', `%${searchLote}%`);
      
      const { data, error } = await query.order('data_hora', { ascending: false }).limit(200);
      if (error) throw error;
      setReportData(data || []);
      
      const { count } = await supabase.from('data').select('*', { count: 'exact', head: true });
      setStats(prev => ({ ...prev, totalTests: count || 0 }));
    } catch (e) {
      console.error('Error fetching global history:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductivityReport = async () => {
      setLoading(true);
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from('global_uniao')
          .select('timestamp, bancada_id')
          .gte('timestamp', thirtyDaysAgo.toISOString());

        if (error) throw error;

        const dayCounts: Record<string, number> = {};
        data?.forEach(row => {
            const date = new Date(row.timestamp).toLocaleDateString('pt-BR');
            dayCounts[date] = (dayCounts[date] || 0) + 1;
        });

        const chartData = Object.keys(dayCounts).map(date => ({
            name: date,
            count: dayCounts[date]
        })).sort((a,b) => {
           const [da, ma, ya] = a.name.split('/').map(Number);
           const [db, mb, yb] = b.name.split('/').map(Number);
           return new Date(ya, ma-1, da).getTime() - new Date(yb, mb-1, db).getTime();
        });

        setReportData(chartData);
      } catch (e) {
        console.error('Error fetching productivity:', e);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (activeReport === 'history') fetchGlobalHistory();
    else if (activeReport === 'uptime') fetchProductivityReport();
  }, [activeReport, activePeriod]);

  // Auxiliar para formatar valores de células
  const formatCellValue = (field: string, value: any) => {
    if (value === null || value === undefined) return '-';
    if (field === 'timestamp' || field === 'Save time' || field === 'data_vinculo') {
        return new Date(value).toLocaleString('pt-BR');
    }
    return String(value);
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Industrial Intelligence</h1>
          <p className="text-white/40 mt-2">Unified data from all benches, partitions and external batches.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  activePeriod === p ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button 
            onClick={() => activeReport === 'history' ? fetchGlobalHistory() : fetchProductivityReport()}
            className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 hover:bg-blue-500/20 transition-all"
          >
            <Download size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Synchronized', value: stats.totalTests.toLocaleString(), icon: Hash, color: 'blue' },
          { label: 'Avg Test Cycle', value: stats.avgTestTime, icon: Timer, color: 'emerald' },
          { label: 'Productivity Index', value: stats.totalUptime, icon: Activity, color: 'amber' },
          { label: 'Active Channels', value: 'Live', icon: RefreshCw, color: 'indigo' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 p-4 bg-${stat.color}-500/5 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity`}>
              <ArrowUpRight size={24} className={`text-${stat.color}-400`} />
            </div>
            <stat.icon className={`text-${stat.color}-400 mb-4`} size={24} />
            <div className="text-2xl font-bold font-mono text-white mb-1">{stat.value}</div>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-3">
          <p className="px-4 pb-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Data Exploration</p>
          {REPORT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveReport(type.id)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-3xl border transition-all duration-300",
                activeReport === type.id 
                  ? "bg-white/10 border-white/20 text-white shadow-xl scale-[1.02]" 
                  : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl child-icon",
                activeReport === type.id ? "bg-blue-500 text-white" : "bg-white/5"
              )}>
                <type.icon size={18} />
              </div>
              <span className="font-semibold text-sm">{type.name}</span>
            </button>
          ))}

          <div className="pt-8 px-4">
             <div className="p-6 bg-blue-500/5 rounded-[32px] border border-blue-500/10 space-y-4">
                <div className="flex items-center gap-2 text-blue-400">
                    <Filter size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Production Feed Filters</span>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-[9px] text-white/20 uppercase block mb-1.5 ml-1">Lote (From CSV)</label>
                        <input 
                          type="text" 
                          value={searchLote}
                          onChange={(e) => setSearchLote(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fetchGlobalHistory()}
                          placeholder="Filter by Batch..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[10px] font-mono text-white/60 focus:outline-none focus:border-blue-500/40"
                        />
                    </div>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-1 pb-1 rounded-[40px] border border-white/5 relative overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 relative z-10">
                <h3 className="text-xl font-bold text-white">
                    {REPORT_TYPES.find(t => t.id === activeReport)?.name}
                </h3>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <input 
                            type="text"
                            placeholder="Search Meter Serial..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchGlobalHistory()}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-white"
                        />
                    </div>
                    <button 
                        onClick={() => activeReport === 'history' ? fetchGlobalHistory() : fetchProductivityReport()}
                        className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:text-white transition-all"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-white/20 text-sm font-mono tracking-widest uppercase">Joining Data Sources...</p>
                </div>
            ) : activeReport === 'uptime' ? (
                <div className="flex-1 px-8">
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#444', fontSize: 10}} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#444', fontSize: 10}} 
                                />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px'}}
                                    itemStyle={{color: '#fff'}}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {reportData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} opacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto px-1">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-white/5">
                                {visibleFields.map(field => (
                                    <th key={field} className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                                        {FIELD_LABELS[field] || field}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {reportData.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleFields.length} className="py-20 text-center text-white/10 italic">
                                        No unified records found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                reportData.map((row, i) => (
                                    <tr key={i} className="group hover:bg-white/[0.01]">
                                        {visibleFields.map(field => {
                                            const val = row[field] || row[field.toLowerCase()] || (field === 'Lote' ? row.lote : null) || (field === 'Lacre' ? row.lacre : null);
                                            
                                            // Estilizações especiais por campo
                                            if (field === 'Meter Number') {
                                                return <td key={field} className="px-6 py-4 font-mono text-blue-400 font-bold text-sm tracking-tighter">{val}</td>;
                                            }
                                            if (field === 'Error conclusion') {
                                                return (
                                                    <td key={field} className="px-6 py-4">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                                            val === 'Aprovado' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                                        )}>
                                                            {val}
                                                        </span>
                                                    </td>
                                                );
                                            }
                                            if (field === 'Lote' || field === 'Lacre') {
                                                return (
                                                    <td key={field} className="px-6 py-4">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                                                            val ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/10" : "bg-white/5 text-white/10 border-transparent"
                                                        )}>
                                                            {val || 'N/A'}
                                                        </span>
                                                    </td>
                                                );
                                            }
                                            if (field === 'Note') {
                                                return (
                                                    <td key={field} className="px-6 py-4">
                                                        {val ? (
                                                            <div className="flex items-center gap-2 text-white/40 text-[10px]">
                                                                <StickyNote size={12} className="shrink-0 text-amber-500/50" />
                                                                <span className="truncate max-w-[120px]">{val}</span>
                                                            </div>
                                                        ) : <span className="text-white/5">-</span>}
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={field} className="px-6 py-4 text-white/40 text-xs font-mono tracking-tight">
                                                    {formatCellValue(field, val)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
