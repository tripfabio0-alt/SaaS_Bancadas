"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  BarChart3, 
  Search, 
  Download, 
  Filter, 
  Calendar,
  Activity,
  FileText,
  RefreshCw,
  Server,
  Layers,
  ChevronDown
} from 'lucide-react';

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleFields, setVisibleFields] = useState<string[]>([]);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase.from('app_config').select('*').eq('id', 1).single();
      if (data) {
        setVisibleFields(data.admin_settings?.visible_fields || ['meter_number', 'lote_produto', 'lacre', 'status_resultado']);
      }
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await fetchConfig();
      let query = supabase.from('global_uniao').select('*');
      
      if (searchTerm) {
        query = query.or(`meter_number.ilike.%${searchTerm}%,lote_produto.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query.order('data_hora', { ascending: false }).limit(100);
      
      if (error || !data || data.length === 0) {
        console.warn('View "global_uniao" vazia ou com erro. Tentando fallback para tabela "data"...');
        const { data: directData, error: directError } = await supabase
          .from('data')
          .select('*, meter_number:"Meter Number", status_resultado:"Error conclusion", data_hora:"Save time"')
          .order('sync_at', { ascending: false })
          .limit(100);
        
        if (directError) throw directError;
        setReportData(directData || []);
      } else {
        setReportData(data);
      }
    } catch (e) {
      console.error('Erro ao buscar relatórios:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const FIELD_LABELS: Record<string, string> = {
    'meter_number': 'Série Medidor',
    'lote_produto': 'Lote (CSV)',
    'lacre': 'Lacre Lote',
    'status_resultado': 'Resultado',
    'observacao': 'Notas/Obs',
    'data_hora': 'Data/Hora Teste',
    'ponto_teste': 'Ponto Q',
    'vazao_real': 'Vazão',
    'erro_relativo': 'Erro Rel.',
    'temperatura_celcius': 'Temp Lab',
    'pressao_pa': 'Pressão Lab',
    'umidade_percentual': 'Umidade',
    'status_tecnico': 'Status Técnico'
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight">Relatórios e Registros</h1>
          <p className="text-[#dae2fd] opacity-40 mt-2 max-w-2xl font-body">Análise histórica consolidada de todos os ensaios industriais correlacionados com dados de batelada.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={fetchData} className="bg-surface-mid border border-outline-variant/10 text-[#dae2fd] text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-3 hover:bg-surface-highest transition-all">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> ATUALIZAR
           </button>
           <button className="machined-gradient text-white font-extrabold text-[10px] tracking-widest uppercase px-8 py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2">
              <Download size={14} /> EXPORTAR RELATÓRIO
           </button>
        </div>
      </header>

      {/* KPI Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-brand-primary opacity-60 mb-4">
            <Activity size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Registros Hoje</span>
          </div>
          <div>
            <h2 className="text-4xl font-bold text-white font-headline">{reportData.length}</h2>
            <p className="text-[10px] text-brand-tertiary font-bold mt-1">+12% vs Ontem</p>
          </div>
        </div>
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-brand-tertiary opacity-60 mb-4">
            <FileText size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Eficiência Global</span>
          </div>
          <div>
            <h2 className="text-4xl font-bold text-white font-headline">98.4%</h2>
            <p className="text-[10px] text-brand-tertiary font-bold mt-1">Acima da Meta</p>
          </div>
        </div>
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10 col-span-2 flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-brand-primary opacity-40">
              <Layers size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Integridade de Dados (Supabase)</span>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex flex-col">
                  <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Status do Sinc</span>
                  <div className="flex items-center gap-2 text-brand-tertiary text-lg font-bold">
                    <div className="w-2 h-2 rounded-full bg-brand-tertiary animate-pulse" />
                    CORRELACIONADO
                  </div>
               </div>
               <div className="flex flex-col border-l border-outline-variant/10 pl-6">
                  <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1">Processamento</span>
                  <span className="text-lg font-bold text-white">HI-DEF</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="p-1.5 bg-surface-mid border border-outline-variant/10 rounded-2xl flex gap-1">
           <button className="px-6 py-2.5 rounded-xl bg-surface-highest text-brand-primary text-[10px] font-bold uppercase tracking-widest shadow-lg">Dados Consolidados</button>
           <button className="px-6 py-2.5 rounded-xl text-[#dae2fd] opacity-40 hover:opacity-100 text-[10px] font-bold uppercase tracking-widest transition-all">Análise Técnica</button>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary opacity-40" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar por Medidor ou Lote..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              className="w-full bg-surface-mid border border-outline-variant/10 rounded-xl py-3 pl-12 pr-4 text-xs text-[#dae2fd] focus:ring-1 focus:ring-brand-primary placeholder:text-[#dae2fd]/20 transition-all font-body"
            />
          </div>
          <button className="bg-surface-mid border border-outline-variant/10 text-[#dae2fd]/60 p-3 rounded-xl hover:bg-surface-highest transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Main Consolidated Table */}
      <section className="bg-surface-mid rounded-2xl border border-outline-variant/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-highest/30">
                {visibleFields.map(field => (
                  <th key={field} className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">
                    {FIELD_LABELS[field] || field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                   <td colSpan={10} className="py-32 text-center text-[#dae2fd] opacity-20 italic">
                      Sincronizando registros industriais...
                   </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                   <td colSpan={10} className="py-24 text-center text-[#dae2fd] opacity-20 italic text-sm">
                      Nenhum registro correlacionado encontrado. Verifique os filtros ou a view SQL.
                   </td>
                </tr>
              ) : reportData.map((row, i) => (
                <tr key={i} className="hover:bg-surface-highest/5 transition-colors group">
                  {visibleFields.map(field => {
                    const value = row[field];
                    if (field === 'status_resultado') {
                      const isOk = ['Aprovado', 'APROVADO', 'OK'].includes(value);
                      return (
                        <td key={field} className="px-8 py-5">
                          <span className={cn(
                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                            isOk ? "bg-brand-tertiary/10 text-brand-tertiary shadow-[0_0_8px_rgba(137,206,255,0.05)]" : "bg-brand-error/10 text-brand-error shadow-[0_0_8px_rgba(255,180,171,0.05)]"
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
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Console */}
        <div className="p-6 bg-surface-highest/20 border-t border-outline-variant/10 flex justify-between items-center text-[10px] font-bold text-[#dae2fd] opacity-40 uppercase tracking-[0.2em]">
           <div className="flex items-center gap-8">
              <span>Streaming: Supabase-Cloud</span>
              <span className="text-brand-primary">Exibindo {reportData.length} registros correlacionados</span>
           </div>
           <div className="flex gap-4">
              <button className="hover:text-brand-primary transition-all">Anterior</button>
              <button className="hover:text-brand-primary transition-all uppercase">Carregar mais <ChevronDown size={14} className="inline ml-1" /></button>
           </div>
        </div>
      </section>

      {/* Decorative Grid Accent */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.03] blueprint-grid" />
    </div>
  );
}
