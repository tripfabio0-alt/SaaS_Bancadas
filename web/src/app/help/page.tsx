"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Terminal, Database, Wifi, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    q: 'Por que uma bancada aparece como "Offline"?',
    a: 'A bancada é marcada como Offline quando nenhum registro foi sincronizado nos últimos 2 horas. Verifique se o script sync_bridge.py está em execução na máquina local e se o caminho do arquivo .accdb está correto no .env.',
  },
  {
    q: 'Qual a diferença entre "Data" e "Full Data"?',
    a: '"Data" contém as colunas principais (ID Mark, Meter Number, Error Conclusion, Save Time). "Full Data" contém todas as colunas do Access armazenadas como JSON no campo raw_payload, útil para análise mais aprofundada.',
  },
  {
    q: 'Com que frequência os dados são sincronizados?',
    a: 'O sync_bridge.py sincroniza a cada 5 minutos por padrão (configurável via SYNC_INTERVAL no .env). Cada ciclo processa todos os 5 bancos de dados sequencialmente.',
  },
  {
    q: 'Como exportar os dados de uma bancada?',
    a: 'Na página de detalhes de cada bancada, clique no botão "Export CSV" no canto superior direito. O arquivo incluirá todos os registros da tab ativa (Data ou Full Data) no formato CSV compatível com Excel.',
  },
  {
    q: 'O que fazer se a sincronização travar?',
    a: 'Reinicie o sync_bridge.py. O script é resiliente — em caso de erro, ele loga o problema em sync_log.txt e continua no próximo ciclo. Verifique o sync_log.txt para diagnóstico.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-4 text-left gap-4 group"
      >
        <span className="font-medium text-white/80 group-hover:text-white transition-colors">{q}</span>
        {open ? <ChevronUp size={16} className="text-white/40 shrink-0" /> : <ChevronDown size={16} className="text-white/40 shrink-0" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-white/50 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-10 pb-20">
      <header>
        <h1 className="text-4xl font-bold text-white tracking-tight">Help Center</h1>
        <p className="text-white/40 mt-2">Documentação de uso e guia de troubleshooting do SaaS Bancadas.</p>
      </header>

      {/* Architecture Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 rounded-3xl"
      >
        <h2 className="text-xl font-bold text-white mb-6">Arquitetura do Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {[
            { icon: Database, label: 'Access DBs', desc: '5 bancos .accdb locais nas máquinas industriais', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { icon: Terminal, label: 'sync_bridge.py', desc: 'Script Python que lê e sincroniza a cada 5 min', color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { icon: Wifi, label: 'Supabase + Vercel', desc: 'Cloud backend + dashboard em tempo real', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((item, i) => (
            <div key={item.label} className="relative">
              <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className={`p-3 rounded-xl ${item.bg}`}>
                  <item.icon size={24} className={item.color} />
                </div>
                <p className="font-bold text-white">{item.label}</p>
                <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
              </div>
              {i < 2 && (
                <div className="hidden md:flex absolute top-1/2 -right-2 z-10 items-center">
                  <span className="text-white/20 text-xl">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Running the Sync */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-3xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10">
              <Terminal size={20} className="text-purple-400" />
            </div>
            <h2 className="font-bold text-white">Rodando o Sync Bridge</h2>
          </div>

          <div className="space-y-3">
            {[
              { step: '1', label: 'Instalar dependências', cmd: 'pip install -r requirements.txt' },
              { step: '2', label: 'Configurar variáveis de ambiente', cmd: 'Editar sync/.env com os caminhos dos .accdb' },
              { step: '3', label: 'Iniciar o sync', cmd: 'python sync/sync_bridge.py' },
              { step: '4', label: 'Monitorar logs', cmd: 'type sync\\sync_log.txt' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-white/30 text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-medium text-white/70">{item.label}</p>
                  <code className="text-xs font-mono text-purple-300/70 bg-white/[0.03] px-2 py-0.5 rounded mt-0.5 inline-block">
                    {item.cmd}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Status reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 rounded-3xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <AlertTriangle size={20} className="text-amber-400" />
            </div>
            <h2 className="font-bold text-white">Referência de Status</h2>
          </div>

          <div className="space-y-3">
            {[
              { status: 'Online', color: 'bg-green-500', badge: 'bg-green-500/10 text-green-400 border-green-500/20', desc: 'Último registro há menos de 15 minutos' },
              { status: 'Idle', color: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', desc: 'Último registro entre 15 min e 2 horas' },
              { status: 'Offline', color: 'bg-red-500', badge: 'bg-red-500/10 text-red-400 border-red-500/20', desc: 'Nenhum registro nas últimas 2 horas' },
            ].map((item) => (
              <div key={item.status} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
                <span className={`w-2 h-2 rounded-full ${item.color} mt-1.5 shrink-0`} />
                <div>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${item.badge}`}>
                    {item.status}
                  </span>
                  <p className="text-xs text-white/40 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-white/30 leading-relaxed">
              O status é calculado com base no campo <code className="text-white/50">timestamp</code> da tabela <code className="text-white/50">data</code> no Supabase, 
              que é preenchido automaticamente pelo sync_bridge.py na hora da sincronização.
            </p>
          </div>
        </motion.div>
      </div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-8 rounded-3xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-500/10">
            <HelpCircle size={20} className="text-blue-400" />
          </div>
          <h2 className="font-bold text-white">Perguntas Frequentes</h2>
        </div>

        <div className="space-y-0">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
