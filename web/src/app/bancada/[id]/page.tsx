"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Download, 
  ArrowLeft, 
  RefreshCw, 
  StickyNote, 
  Layers,
  Activity,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn, formatSafeDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const TABS = ['Dados Consolidados', 'Logs Primários', 'Payload Técnico'];
const PAGE_SIZE = 100;

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
  'id_mark': 'ID Mark'
};

type BenchStatus = 'Online' | 'Ociosa' | 'Offline';

export default function BenchDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Dados Consolidados');
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
      const { data } = await supabase.from('app_config').select('*').eq('id', 1).single();
      if (data) {
        setVisibleFields(data.admin_settings?.visible_fields || ['meter_number', 'lote_produto', 'status_resultado', 'data_hora']);
        const currentBench = data.benches_config?.find((b: any) => String(b.id) === String(id));
        if (currentBench) setBenchName(currentBench.name);
      }
    } catch (e) {
      setVisibleFields(['meter_number', 'lote_produto', 'status_resultado', 'data_hora']);
    }
  };

  const fetchData = async (currentPage = page) => {
    setLoading(true);
    try {
      if (visibleFields.length === 0) await fetchConfig();
      
      const isConsolidated = activeTab === 'Dados Consolidados';
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 1. Primária: Buscar dados da bancada
      let query;
      if (isConsolidated) {
        query = supabase.from('global_uniao').select('*', { count: 'exact' });
      } else if (activeTab === 'Logs Primários') {
        query = supabase.from('data').select('*', { count: 'exact' });
      } else {
        query = supabase.from('full_data').select('*', { count: 'exact' });
      }

      const [{ data: result, error: fetchError, count }, statusRes] = await Promise.all([
        query
          .or(`bancada_id.eq.${id},bancada_id.eq."${id}"`)
          .order(isConsolidated ? 'data_hora' : 'sync_at', { ascending: false })
          .range(from, to),
        supabase
          .from('data')
          .select('sync_at')
          .or(`bancada_id.eq.${id},bancada_id.eq."${id}"`)
          .order('sync_at', { ascending: false })
          .limit(1)
      ]);

      // Fallback para Consolidated Data se a view falhar
      if (isConsolidated && (fetchError || !result || result.length === 0)) {
         console.warn("View 'global_uniao' falhou ou vazia. Usando fallback...");
         const { data: fallbackRes } = await supabase
           .from('data')
           .select('*, meter_number:"Meter Number", status_resultado:"Error conclusion", data_hora:"Save time"')
           .or(`bancada_id.eq.${id},bancada_id.eq."${id}"`)
           .order('sync_at', { ascending: false })
           .range(from, to);
         setData(fallbackRes || []);
      } else {
         setData(result || []);
      }
      
      setTotalCount(count || 0);
      
      const lastSync = statusRes.data?.[0]?.sync_at;
      if (lastSync) {
         const diff = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60);
         setBenchStatus(diff < 30 ? 'Online' : diff < 180 ? 'Ociosa' : 'Offline');
      }
    } catch (err) {
      console.error('Erro na carga da bancada:', err);
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

  const filteredData = data.filter(item => {
    const s = searchTerm.toLowerCase();
    return Object.values(item).some(v => String(v).toLowerCase().includes(s));
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-outline-variant/10 pb-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="w-12 h-12 rounded-xl bg-surface-mid border border-outline-variant/10 flex items-center justify-center text-[#dae2fd] opacity-40 hover:opacity-100 hover:bg-surface-highest transition-all group shadow-lg">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight uppercase">{benchName}</h1>
              <span className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-xl flex items-center gap-2",
                benchStatus === 'Online' ? "bg-brand-tertiary/10 text-brand-tertiary border-brand-tertiary/20" :
                benchStatus === 'Ociosa' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                "bg-brand-error/10 text-brand-error border-brand-error/20"
              )}>
                <div className={cn("w-2 h-2 rounded-full", benchStatus === 'Online' ? "bg-brand-tertiary animate-pulse" : benchStatus === 'Ociosa' ? "bg-amber-400" : "bg-brand-error")} />
                Protocolo {benchStatus}
              </span>
            </div>
            <p className="text-[#dae2fd] opacity-40 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <Cpu size={12} /> Cluster de Nó Industrial #0{id} — Latência Gerenciada
            </p>
          </div>
        </div>

        <div className="flex gap-3">
           <button onClick={() => fetchData(page)} className="bg-surface-mid border border-outline-variant/10 text-[#dae2fd] text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-3 hover:bg-surface-highest transition-all">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> ATUALIZAR
           </button>
           <button className="machined-gradient text-white font-extrabold text-[10px] tracking-widest uppercase px-8 py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2">
              <Download size={14} /> EXPORTAR LOG DO NÓ
           </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="p-1.5 bg-surface-mid border border-outline-variant/10 rounded-2xl flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === tab ? "bg-surface-highest text-brand-primary shadow-lg border border-brand-primary/10" : "text-[#dae2fd] opacity-40 hover:opacity-100"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary opacity-40 group-focus-within:opacity-100 transition-opacity" size={16} />
          <input 
            type="text" 
            placeholder="Pesquisar no fluxo de dados do nó..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-mid border border-outline-variant/10 rounded-xl py-3 pl-12 pr-4 text-xs text-[#dae2fd] focus:ring-1 focus:ring-brand-primary transition-all placeholder:text-[#dae2fd]/20"
          />
        </div>
      </div>

      <section className="bg-surface-mid rounded-2xl border border-outline-variant/10 overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-highest/30">
                {activeTab === 'Dados Consolidados' ? (
                   visibleFields.map(f => (
                    <th key={f} className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase whitespace-nowrap">
                      {FIELD_LABELS[f] || f}
                    </th>
                   ))
                ) : activeTab === 'Logs Primários' ? (
                  <>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">Série Medidor</th>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">Resultado</th>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">Data/Hora Log</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">ID Mark / Anchor</th>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">Payload Industrial JSON</th>
                    <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] text-[#dae2fd] opacity-30 uppercase">Sincronização Cloud</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                   <td colSpan={10} className="py-32 text-center text-[#dae2fd] opacity-20 italic">
                      <div className="flex flex-col items-center gap-4">
                         <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                         <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Abrindo Porta de Stream Segura...</span>
                      </div>
                   </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                   <td colSpan={10} className="py-24 text-center text-[#dae2fd] opacity-20 italic text-sm">
                      Nenhum registro detectado no registro deste nó.
                   </td>
                </tr>
              ) : filteredData.map((row, i) => (
                <tr key={i} className="hover:bg-surface-highest/10 transition-colors group">
                  {activeTab === 'Dados Consolidados' ? (
                    visibleFields.map(field => {
                      const value = row[field];
                      if (field === 'status_resultado') {
                        const isOk = ['Aprovado', 'APROVADO', 'OK'].includes(value);
                        return (
                          <td key={field} className="px-8 py-5">
                            <span className={cn(
                              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight shadow-sm",
                              isOk ? "bg-brand-tertiary/10 text-brand-tertiary border border-brand-tertiary/10" : "bg-brand-error/10 text-brand-error border border-brand-error/10"
                            )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full", isOk ? "bg-brand-tertiary" : "bg-brand-error")} />
                              {value || 'Pendente'}
                            </span>
                          </td>
                        );
                      }
                      if (field === 'data_hora') return <td key={field} className="px-8 py-5 text-xs text-[#dae2fd] opacity-40 font-mono italic">{formatSafeDate(value, 'yyyy-MM-dd HH:mm:ss')}</td>;
                      if (field === 'meter_number') return <td key={field} className="px-8 py-5 font-mono text-sm font-bold text-brand-primary">{value}</td>;
                      
                      return <td key={field} className="px-8 py-5 text-xs text-[#dae2fd] opacity-60">{value === null || value === undefined ? '-' : String(value)}</td>;
                    })
                  ) : activeTab === 'Logs Primários' ? (
                    <>
                       <td className="px-8 py-5 font-mono text-sm font-bold text-brand-primary">{row['Meter Number'] || row.meter_number || '-'}</td>
                       <td className="px-8 py-5">
                          <span className={cn(
                             "px-3 py-1 rounded-lg text-[10px] font-bold uppercase",
                             (row['Error conclusion'] || row.status_resultado) === 'Aprovado' ? "bg-brand-tertiary/10 text-brand-tertiary" : "bg-brand-error/10 text-brand-error"
                          )}>{row['Error conclusion'] || row.status_resultado || 'N/A'}</span>
                       </td>
                       <td className="px-8 py-5 text-xs text-[#dae2fd] opacity-30 font-mono italic">{formatSafeDate(row['Save time'] || row.data_hora || row.timestamp, 'yyyy-MM-dd HH:mm:ss')}</td>
                    </>
                  ) : (
                    <>
                       <td className="px-8 py-5 font-mono text-xs font-bold text-brand-primary">{row['ID Mark'] || row.id_mark || row.composite_id}</td>
                       <td className="px-8 py-5">
                           <div className="bg-surface-lowest p-3 border border-outline-variant/10 rounded-xl max-w-sm truncate text-[10px] font-mono text-[#dae2fd] opacity-40 group-hover:opacity-100 transition-opacity">
                              {JSON.stringify(row.raw_payload || row)}
                           </div>
                       </td>
                       <td className="px-8 py-5 text-xs text-[#dae2fd] opacity-30 font-mono italic">{formatSafeDate(row.sync_at, 'yyyy-MM-dd HH:mm:ss')}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-surface-highest/20 border-t border-outline-variant/10 flex justify-between items-center text-[10px] font-bold text-[#dae2fd] opacity-40 uppercase tracking-[0.2em]">
           <div className="flex items-center gap-6">
              <span className="text-brand-tertiary flex items-center gap-2"><ShieldCheck size={14} /> Integridade do Nó: Alta</span>
              <span>Carregados {data.length} registros</span>
           </div>
           <div className="flex gap-4">
              <button 
                onClick={() => setPage(p => p - 1)} disabled={page === 0}
                className="flex items-center gap-1 hover:text-brand-primary transition-all disabled:opacity-5"
              ><ChevronLeft size={14} /> Anterior</button>
              <button 
                onClick={() => setPage(p => p + 1)} disabled={data.length < PAGE_SIZE}
                className="flex items-center gap-1 hover:text-brand-primary transition-all disabled:opacity-5"
              >Próximo Grupo <ChevronRight size={14} /></button>
           </div>
        </div>
      </section>

      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.02] blueprint-grid" />
    </div>
  );
}
