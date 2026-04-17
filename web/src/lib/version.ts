export const APP_VERSION = '1.7.9';
export const APP_BUILD_DATE = '2026-04-17';

export interface VersionEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch' | 'fix' | 'feat';
  changes: { type: 'feat' | 'fix' | 'chore'; description: string }[];
}

export const CHANGELOG: VersionEntry[] = [
  {
    version: '1.7.9',
    date: '2026-04-17',
    type: 'feat',
    changes: [
      { type: 'feat', description: 'Harmonização de Dados: Lógica de chaves canônicas (PT/EN) no sincronizador' },
      { type: 'feat', description: 'Dashboard: Alinhamento de campos dinâmicos e cobertura total de parâmetros técnicos' },
      { type: 'fix',  description: 'Infraestrutura: Expansão da tabela de vincúlo de lacres para campos Inmetro' },
    ],
  },
  {
    version: '1.7.8',
    date: '2026-04-17',
    type: 'fix',
    changes: [
      { type: 'fix',  description: 'Estabilidade: Correção do worker de build e mapeamento de tipos no console ADM' },
      { type: 'feat', description: 'Produção: Versão final estável para publicação no GitHub' },
    ],
  },
  {
    version: '1.7.7',
    date: '2026-04-16',
    type: 'feat',
    changes: [
      { type: 'feat', description: 'Inteligência de Display: Reordenação dinâmica de colunas (↑ ↓) nas tabelas' },
      { type: 'feat', description: 'Dados Totais: Exposição de 100% dos parâmetros técnicos (Pressão, Temp, Vazão)' },
      { type: 'feat', description: 'Mapeamento CSV: Cobertura completa dos 8 campos do Relatório.csv (Inmetro, Sequencial, etc)' },
    ],
  },
  {
    version: '1.7.6',
    date: '2026-04-16',
    type: 'fix',
    changes: [
      { type: 'fix',  description: 'Estabilidade: Correção de parsing de aspas e erros de build na Vercel' },
      { type: 'feat', description: 'Unified View: Implementação da visão global_uniao robusta' },
    ],
  },
  {
    version: '1.7.5',
    date: '2026-04-15',
    type: 'feat',
    changes: [
      { type: 'feat', description: 'Arquitetura Universal: Suporte a multi-partições de rede por bancada' },
      { type: 'feat', description: 'Sincronizador: Bridge v6.0 com automação inteligente de lotes e lacres' },
    ],
  },
  {
    version: '1.6.5',
    date: '2026-04-15',
    type: 'fix',
    changes: [
      { type: 'fix',  description: 'Correção: Erro de importação de Lucide Icons' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-04-15',
    type: 'minor',
    changes: [
      { type: 'feat', description: 'Produção: Entrega final das otimizações de dashboard' },
      { type: 'feat', description: 'Performance: Gráficos históricos multiescala (24h, 30d, 12m) com agrupamento inteligente' },
      { type: 'fix',  description: 'Sincronização: Bridge de dados agora usa composite_id para evitar colisões entre bancadas' },
      { type: 'fix',  description: 'Timestamps: Padronização completa para ISO 8601 (UTC) em todo o ecossistema' },
    ],
  },
  {
    version: '1.4.2',
    date: '2026-04-15',
    type: 'fix',
    changes: [
      { type: 'fix', description: 'Correção crítica: importação de utilitário (cn) que estava quebrando o build de produção' },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-04-15',
    type: 'feat',
    changes: [
      { type: 'feat', description: 'Gráfico: adicionado seletor de período (24h, 30 dias, 12 meses)' },
      { type: 'feat', description: 'Histórico: suporte total para visualização de registros de anos atrás' },
      { type: 'fix',  description: 'Ordenação resiliente: registros sem timestamp agora aparecem corretamente no histórico' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-04-15',
    type: 'fix',
    changes: [
      { type: 'fix', description: 'Conectividade Supabase: removido fallback estático e adicionado logs de erro' },
      { type: 'fix', description: 'Gráfico de Atividade: reparado parsing de datas e alinhamento de fuso horário (UTC)' },
      { type: 'fix', description: 'Timestamps: padronização ISO 8601 com sufixo Z para compatibilidade total' },
      { type: 'chore', description: 'Limpeza de repositório: ignorando logs locais e arquivos de estado' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-04-14',
    type: 'minor',
    changes: [
      { type: 'feat', description: 'Settings: campos separados para Data e Full Data por bancada' },
      { type: 'fix',  description: 'Status das bancadas agora usa sync_at (momento da sincronia) e não timestamp antigo' },
      { type: 'fix',  description: 'composite_id garante isolamento por bancada — fim do bug de sobrescrita' },
      { type: 'fix',  description: 'Paths padrão do Settings corrigidos para Full Data.accdb' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-04-14',
    type: 'minor',
    changes: [
      { type: 'feat', description: 'Gráfico de atividade de produção por hora (últimas 24h) com Recharts' },
      { type: 'feat', description: 'Sistema de notificações toast para mudanças de status das bancadas' },
      { type: 'feat', description: 'Download Report: exportação CSV consolidada de todas as bancadas' },
      { type: 'feat', description: 'Página /settings com configuração de paths e conexão Supabase' },
      { type: 'feat', description: 'Página /help com arquitetura, guia de uso e FAQ' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-14',
    type: 'minor',
    changes: [
      { type: 'fix',  description: 'Importações faltando em page.tsx (Activity, Database, Clock, motion)' },
      { type: 'fix',  description: 'Full Data ordenado por sync_at em vez de timestamp' },
      { type: 'feat', description: 'Status Online/Idle/Offline dinâmico na página de detalhe da bancada' },
      { type: 'feat', description: 'Paginação funcional com controles Previous/Next e contador de páginas' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-04-10',
    type: 'major',
    changes: [
      { type: 'feat', description: 'Dashboard principal com status em tempo real de 5 bancadas industriais' },
      { type: 'feat', description: 'Página de detalhe por bancada com tabs Data e Full Data' },
      { type: 'feat', description: 'sync_bridge.py V4 com mapeamento flexível de colunas do Access' },
      { type: 'feat', description: 'Export CSV por bancada' },
      { type: 'feat', description: 'Realtime subscription via Supabase channels' },
      { type: 'feat', description: 'Design glassmorphism com framer-motion animations' },
    ],
  },
];
