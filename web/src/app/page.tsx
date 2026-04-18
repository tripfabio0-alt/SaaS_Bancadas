"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn, formatSafeDate } from '@/lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download
} from 'lucide-react';

const PAGE_SIZE = 50;

export default function Home() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [benches, setBenches] = useState<any[]>([]);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    approved: 0,
    rejected: 0,
    onlineCount: 0,
    totalBenches: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const FIELD_LABELS: Record<string, string> = {
    'meter_number': 'Série Medidor',
    'status_resultado': 'Resultado',
    'data_hora': 'Data/Hora',
    'lote_produto': 'Lote (CSV)',
    'lacre': 'Lacre',
    'observacao': 'Obs',
    'ponto_teste': 'Ponto Q',
    'vazao_real': 'Vazão',
    'erro_relativo': 'Erro (%)',
    'temperatura_celcius': 'Temp Lab',
    'umidade_percentual': 'Umidade',
    'wme_value': 'WME'
  };

  const fetchConfig = async () => {
    try {
      const { data: config } = await supabase.from('app_config').select('*').eq('id', 1).single();
      if (config) {
        setVisibleFields(config.admin_settings?.visible_fields || ['meter_number', 'lote_produto', 'status_resultado', 'data_hora']);
        const benchConfigs = config.benches_config || [];
        
        const benchStatusPromises = benchConfigs.map(async (b: any) => {
          const { data: latest } = await supabase
            .from('data')
            .select('sync_at')
            .or(`bancada_id.eq.${b.id},bancada_id.eq."${b.id}"`)
            .order('sync_at', { ascending: false })
            .limit(1);
          const lastSync = latest?.[0]?.sync_at;
          const isOnline = lastSync ? (Date.now() - new Date(lastSync).getTime() < 30 * 60 * 1000) : false;
          return { ...b, isOnline };
        });
        
        const resolvedBenches = await Promise.all(benchStatusPromises);
        setBenches(resolvedBenches);
        setSummary(prev => ({ 
          ...prev, 
          onlineCount: resolvedBenches.filter(b => b.isOnline).length,
          totalBenches: resolvedBenches.length
        }));
      }
    } catch (e) { console.error(e); }
  };

  const fetchData = async (currentPage = page) => {
    setLoading(true);
    try {
      await fetchConfig();
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from('global_uniao').select('*', { count: 'exact' });
      
      if (searchTerm) {
        query = query.or(`meter_number.ilike.%${searchTerm}%,lote_produto.ilike.%${searchTerm}%,lacre.ilike.%${searchTerm}%`);
      }
      
      const { data, count, error } = await query
        .order('data_hora', { ascending: false })
        .range(from, to);
      
      if (error || !data) {
        // Fallback robusto se a view estiver falhando
        const { data: fallbackData } = await supabase
          .from('data')
          .select('*, meter_number:"Meter Number", status_resultado:"Error conclusion", data_hora:"Save time"')
          .order('sync_at', { ascending: false })
          .range(from, to);
        setReportData(fallbackData || []);
      } else {
        setReportData(data);
      }
      
      // Contagem de aprovados no lote carregado
      const approved = (data || []).filter(r => ['Aprovado', 'OK'].includes(r.status_resultado)).length;
      setSummary(prev => ({ ...prev, approved, rejected: (data?.length || 0) - approved }));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0);
  }, [searchTerm]);

  useEffect(() => {
    fetchData(page);
  }, [page]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* KPI Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10">
          <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-4">Aprovados (Lote Atual)</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-extrabold text-brand-tertiary">{summary.approved}</h2>
            <ArrowUpRight className="text-brand-tertiary opacity-40" />
          </div>
        </div>
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10">
          <p className="text-[10px] font-bold text-brand-error uppercase tracking-widest mb-4">Reprovados (Lote Atual)</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-extrabold text-brand-error">{summary.rejected}</h2>
            <ArrowDownRight className="text-brand-error opacity-40" />
          </div>
        </div>
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10 col-span-2 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Monitoramento de Nós</p>
            <h3 className="text-xl font-bold text-white uppercase">{summary.onlineCount} de {summary.totalBenches} Bancadas Operantes</h3>
          </div>
          <div className="flex -space-x-2">
            {benches.map((b, i) => (
              <div key={i} title={b.name} className={cn(
                "w-10 h-10 rounded-full border-2 border-surface-mid flex items-center justify-center text-[10px] font-bold",
                b.isOnline ? "bg-brand-tertiary text-black" : "bg-surface-highest text-white/20"
              )}>0{b.id}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Interface (Tabelão) */}
      <section className="bg-surface-mid rounded-2xl border border-outline-variant/10 overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 bg-surface-highest/20 border-b border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-headline">Tabelão de Registros Industriais</h2>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Unificação: Access + JSON + CSV</p>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary opacity-40" size={16} />
              <input 
                type="text" placeholder="Pesquisar Medidor, Lote ou Lacre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background-deep/50 border border-outline-variant/10 rounded-xl py-3 pl-12 pr-4 text-xs text-white focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <button onClick={() => fetchData(page)} className="bg-surface-highest/50 p-3 rounded-xl hover:bg-surface-highest text-brand-primary transition-all">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-highest/10">
                {visibleFields.map(f => (
                  <th key={f} className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-brand-primary/40 whitespace-nowrap">
                    {FIELD_LABELS[f] || f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr><td colSpan={20} className="py-24 text-center opacity-20 italic">Sincronizando fluxo de registros...</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan={20} className="py-24 text-center opacity-20 italic">Nenhum dado encontrado para os filtros atuais.</td></tr>
              ) : reportData.map((row, i) => (
                <tr key={i} className="hover:bg-surface-highest/5 transition-colors">
                  {visibleFields.map(field => {
                    const value = row[field];
                    if (field === 'status_resultado') {
                      const isOk = ['Aprovado', 'APROVADO', 'OK'].includes(value);
                      return (
                        <td key={field} className="px-8 py-5">
                          <span className={cn(
                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight shadow-sm",
                            isOk ? "bg-brand-tertiary/10 text-brand-tertiary" : "bg-brand-error/10 text-brand-error"
                          )}>
                             <div className={cn("w-1.5 h-1.5 rounded-full", isOk ? "bg-brand-tertiary" : "bg-brand-error")} />
                             {value || 'Pendente'}
                          </span>
                        </td>
                      );
                    }
                    if (field === 'data_hora') return <td key={field} className="px-8 py-5 text-xs text-white/40 tabular-nums italic">{formatSafeDate(value, 'yyyy-MM-dd HH:mm:ss')}</td>;
                    if (field === 'meter_number') return <td key={field} className="px-8 py-5 font-mono text-sm font-bold text-brand-primary">{value || '-'}</td>;
                    return <td key={field} className="px-8 py-5 text-xs text-white/60">{value === null || value === undefined ? '-' : String(value)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Paginação */}
        <div className="p-6 bg-surface-highest/20 border-t border-outline-variant/10 flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-widest">
           <div className="flex gap-4">
              <span>Nó de Origem: Supabase Cloud</span>
              <span className="text-brand-tertiary">Streaming Ativo</span>
           </div>
           <div className="flex gap-6 items-center">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="hover:text-brand-primary transition-all disabled:opacity-5 flex items-center gap-1">
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-white font-black">Página {page + 1}</span>
              <button disabled={reportData.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="hover:text-brand-primary transition-all disabled:opacity-5 flex items-center gap-1">
                Próximo <ChevronRight size={14} />
              </button>
           </div>
        </div>
      </section>

      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.03] blueprint-grid" />
    </div>
  );
}
