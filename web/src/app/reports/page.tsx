"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn, formatSafeDate } from '@/lib/utils';
import { 
  Search, 
  Download, 
  Filter, 
  Activity,
  FileText,
  RefreshCw,
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
    } catch (e) {
      setVisibleFields(['meter_number', 'lote_produto', 'lacre', 'status_resultado']);
    }
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
        console.warn('View "global_uniao" indisponível. Usando fallback direto.');
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
      setReportData([]);
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
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight">Relatórios e Registros</h1>
          <p className="text-[#dae2fd] opacity-40 mt-2 max-w-2xl font-body">Consolidação histórica de ensaios industriais.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={fetchData} className="bg-surface-mid border border-outline-variant/10 text-[#dae2fd] text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-3 hover:bg-surface-highest">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> ATUALIZAR
           </button>
           <button className="machined-gradient text-white font-extrabold text-[10px] tracking-widest uppercase px-8 py-3 rounded-xl shadow-lg active:scale-95 transition-all">
              <Download size={14} className="inline mr-2" /> EXPORTAR
           </button>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary opacity-60">Registros Ativos</span>
          <h2 className="text-4xl font-bold text-white mt-2">{reportData.length}</h2>
        </div>
        <div className="bg-surface-mid p-6 rounded-2xl border border-outline-variant/10 col-span-3">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl"><Layers size={20} /></div>
              <div>
                 <p className="text-xs font-bold text-white">Status da Rede Supabase</p>
                 <p className="text-[10px] text-brand-tertiary">CONEXÃO SEGURA ATIVA</p>
              </div>
           </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary opacity-40" size={16} />
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            placeholder="Pesquisar por Medidor ou Lote..." 
            className="w-full bg-surface-mid border border-outline-variant/10 rounded-xl py-3 pl-12 pr-4 text-xs text-[#dae2fd] focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Main Table */}
      <section className="bg-surface-mid rounded-2xl border border-outline-variant/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-highest/30">
                {visibleFields.map(field => (
                  <th key={field} className="px-8 py-6 text-[10px] font-bold text-[#dae2fd] opacity-30 uppercase tracking-widest">
                    {FIELD_LABELS[field] || field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {!loading && reportData.length === 0 ? (
                <tr>
                   <td colSpan={10} className="py-24 text-center text-[#dae2fd] opacity-20 italic">Nenhum registro encontrado.</td>
                </tr>
              ) : reportData.map((row, i) => (
                <tr key={i} className="hover:bg-surface-highest/5 transition-colors">
                  {visibleFields.map(field => {
                    const value = row[field];
                    if (field === 'status_resultado') {
                      const isOk = ['Aprovado', 'APROVADO', 'OK'].includes(value);
                      return (
                        <td key={field} className="px-8 py-5">
                          <span className={cn(
                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                            isOk ? "bg-brand-tertiary/10 text-brand-tertiary" : "bg-brand-error/10 text-brand-error"
                          )}>
                            {value || 'PENDENTE'}
                          </span>
                        </td>
                      );
                    }
                    if (field === 'data_hora') return <td key={field} className="px-8 py-5 text-xs text-[#dae2fd] opacity-40 font-mono">{formatSafeDate(value, 'yyyy-MM-dd HH:mm:ss')}</td>;
                    if (field === 'meter_number') return <td key={field} className="px-8 py-5 font-mono text-sm font-bold text-brand-primary">{value || '-'}</td>;
                    return <td key={field} className="px-8 py-5 text-xs text-[#dae2fd] opacity-60">{value === null || value === undefined ? '-' : String(value)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
