"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn, formatSafeDate } from '@/lib/utils';
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Database,
  Filter,
  Layers
} from 'lucide-react';

const PAGE_SIZE = 50;

type Period = 'today' | 'week' | 'month' | 'all';

export default function Home() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [benches, setBenches] = useState<any[]>([]);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  // PADRÃO: TUDO para visibilidade imediata de todo o histórico (341k registros)
  const [period, setPeriod] = useState<Period>('all');
  const [summary, setSummary] = useState({
    approved: 0,
    rejected: 0,
    onlineCount: 0,
    totalInCloud: 0
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
    'pressao_pa': 'Pressão (Pa)',
    'data_sincronismo': 'Sincronização Cloud'
  };

  const fetchConfigAndCounts = async () => {
    try {
      const { data: config } = await supabase.from('app_config').select('*').eq('id', 1).single();
      
      // Contagem Total Cloud
      const { count: grandTotal } = await supabase.from('data').select('*', { count: 'exact', head: true });

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
          const isOnline = lastSync ? (Date.now() - new Date(lastSync).getTime() < 180 * 60 * 1000) : false;
          return { ...b, isOnline };
        });
        
        const resolvedBenches = await Promise.all(benchStatusPromises);
        setBenches(resolvedBenches);
        setSummary(prev => ({ 
          ...prev, 
          onlineCount: resolvedBenches.filter(b => b.isOnline).length,
          totalInCloud: grandTotal || 0,
          approved: 0, // Será atualizado pelo fetchData do período
          rejected: 0
        }));
      }
    } catch (e) { console.error(e); }
  };

  const fetchData = async (currentPage = page, currentPeriod = period) => {
    setLoading(true);
    try {
      await fetchConfigAndCounts();
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from('global_uniao').select('*', { count: 'exact' });
      
      if (currentPeriod !== 'all') {
        const now = new Date();
        let startDate = new Date();
        if (currentPeriod === 'today') startDate.setHours(0,0,0,0);
        if (currentPeriod === 'week') startDate.setDate(now.getDate() - 7);
        if (currentPeriod === 'month') startDate.setDate(now.getDate() - 30);
        query = query.gte('data_hora', startDate.toISOString());
      }

      if (searchTerm) {
        query = query.or(`meter_number.ilike.%${searchTerm}%,lote_produto.ilike.%${searchTerm}%,lacre.ilike.%${searchTerm}%,"ID Mark".ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query
        .order('data_hora', { ascending: false })
        .range(from, to);
      
      if (error || !data) {
        setReportData([]);
      } else {
        setReportData(data);
        // Atualizar aprovações/reprovações do lote visível
        const app = data.filter(r => ['Aprovado', 'OK', 'PASSED'].includes(r.status_resultado || '')).length;
        setSummary(prev => ({ ...prev, approved: app, rejected: data.length - app }));
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, period);
  }, [searchTerm, period]);

  useEffect(() => {
    fetchData(page, period);
  }, [page]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10 shadow-sm border-l-4 border-l-brand-tertiary">
          <p className="text-[10px] font-black text-brand-tertiary uppercase tracking-widest mb-4 flex items-center gap-2"><Database size={12} /> Unidade Cloud</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-extrabold text-text-main">{summary.totalInCloud.toLocaleString('pt-BR')}</h2>
            <Layers className="text-brand-tertiary opacity-20" size={32} />
          </div>
          <p className="text-[9px] text-text-dim mt-2 uppercase font-bold">Total de Registros no Tabelão</p>
        </div>
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10 shadow-sm border-l-4 border-l-brand-primary">
          <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-4 flex items-center gap-2"><Filter size={12} /> Visíveis ({period})</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-extrabold text-text-main">{reportData.length}</h2>
            <ArrowUpRight className="text-brand-primary opacity-20" size={32} />
          </div>
          <p className="text-[9px] text-text-dim mt-2 uppercase font-bold">Mostrando Lote Atual</p>
        </div>
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10 col-span-2 flex justify-between items-center shadow-lg">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-2">Monitoramento Industrial</p>
            <h3 className="text-xl font-bold text-text-main uppercase">{summary.onlineCount} Nós Operantes</h3>
            <div className="flex gap-1.5 mt-3">
              {benches.map((b) => (
                <div key={b.id} title={b.name} className={cn(
                  "w-12 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-black transition-all border-2",
                  b.isOnline ? "bg-brand-tertiary/20 border-brand-tertiary text-text-main shadow-[0_0_15px_rgba(74,222,128,0.1)]" : "bg-surface-highest/20 border-outline-variant/30 text-text-dim"
                )}>
                  <span>0{b.id}</span>
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1", b.isOnline ? "bg-brand-tertiary" : "bg-brand-error")} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="bg-surface-mid rounded-2xl border border-outline-variant/10 overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 bg-surface-highest/10 border-b border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary shadow-inner">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main font-headline">Gerenciamento Unificado de Lotes</h2>
              <div className="flex bg-surface-lowest p-1 rounded-xl mt-3 border border-outline-variant/5">
                {[
                  { id: 'today', label: 'Hoje' },
                  { id: 'week', label: '7 Dias' },
                  { id: 'month', label: '30 Dias' },
                  { id: 'all', label: 'Tudo' }
                ].map(p => (
                  <button 
                    key={p.id} onClick={() => { setPeriod(p.id as Period); setPage(0); }}
                    className={cn(
                      "px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest",
                      period === p.id ? "bg-brand-primary text-black shadow-md" : "text-text-dim hover:text-text-main hover:bg-surface-highest/10"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary/40" size={18} />
              <input 
                type="text" placeholder="ID Mark, Série, Lote ou Lacre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-lowest border border-outline-variant/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs text-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none"
              />
            </div>
            <button onClick={() => fetchData(page, period)} className="bg-surface-highest/40 p-3.5 rounded-2xl hover:bg-brand-primary/20 text-brand-primary transition-all shadow-sm border border-outline-variant/5">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-highest/10 border-b border-outline-variant/10">
                {visibleFields.map(f => (
                  <th key={f} className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#dae2fd] opacity-40 whitespace-nowrap">
                    {FIELD_LABELS[f] || f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr><td colSpan={20} className="py-32 text-center text-text-dim italic font-headline tracking-widest">Estabelecendo Conexão Industrial...</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan={20} className="py-24 text-center text-text-dim italic font-headline underline decoration-brand-error/20">Sem registros detectados na triagem atual.</td></tr>
              ) : reportData.map((row, i) => (
                <tr key={i} className="hover:bg-surface-highest/5 transition-colors group border-transparent hover:border-brand-primary/10 border-l-4">
                  {visibleFields.map(field => {
                    const value = row[field];
                    if (field === 'status_resultado') {
                      const isOk = ['Aprovado', 'OK', 'PASSED'].includes(value || '');
                      return (
                        <td key={field} className="px-8 py-6">
                          <span className={cn(
                            "inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm border",
                            isOk ? "bg-brand-tertiary/10 text-brand-tertiary border-brand-tertiary/20" : "bg-brand-error/10 text-brand-error border-brand-error/20"
                          )}>
                             <div className={cn("w-2 h-2 rounded-full", isOk ? "bg-brand-tertiary animate-pulse" : "bg-brand-error")} />
                             {value || 'Pendente'}
                          </span>
                        </td>
                      );
                    }
                    if (field === 'data_hora') return <td key={field} className="px-8 py-6 text-xs text-text-sub tabular-nums font-mono opacity-80">{formatSafeDate(value, 'yyyy-MM-dd HH:mm:ss')}</td>;
                    if (field === 'meter_number') return <td key={field} className="px-8 py-6 font-mono text-sm font-bold text-brand-primary tracking-tighter">{value || '-'}</td>;
                    return <td key={field} className="px-8 py-6 text-xs text-text-sub group-hover:text-text-main transition-colors font-medium">{value === null || value === undefined ? '-' : String(value)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-8 bg-surface-highest/5 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 text-brand-tertiary">
                <div className="w-2 h-2 rounded-full bg-brand-tertiary shadow-[0_0_8px_#4ade80]" />
                <span className="text-[10px] font-black uppercase tracking-widest">Banco Sincronizado</span>
              </div>
              <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">{reportData.length} registros no lote visível</span>
           </div>
           
           <div className="flex gap-4 items-center">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-3 bg-surface-lowest rounded-xl hover:bg-brand-primary/10 transition-all disabled:opacity-10 border border-outline-variant/5">
                <ChevronLeft size={20} />
              </button>
              <div className="bg-brand-primary/5 px-6 py-2.5 rounded-xl text-brand-primary font-black text-xs border border-brand-primary/10">LOTE {page + 1}</div>
              <button disabled={reportData.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="p-3 bg-surface-lowest rounded-xl hover:bg-brand-primary/10 transition-all disabled:opacity-10 border border-outline-variant/5">
                <ChevronRight size={20} />
              </button>
           </div>
        </div>
      </section>

      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.02] blueprint-grid" />
    </div>
  );
}
