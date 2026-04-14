"use client";

import { useState } from 'react';
import { Save, AlertTriangle, CheckCircle2, Database, Clock, Server } from 'lucide-react';
import { motion } from 'framer-motion';

const BANCADAS = [1, 2, 3, 4, 5];

type BancadaPaths = {
  data: string;
  fullData: string;
};

const defaultPaths: Record<number, BancadaPaths> = Object.fromEntries(
  BANCADAS.map(id => [
    id,
    {
      data:     `C:\\Users\\User\\Documents\\BD\\database${id}\\Data.accdb`,
      fullData: `C:\\Users\\User\\Documents\\BD\\database${id}\\Full Data.accdb`,
    },
  ])
);

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [syncInterval, setSyncInterval] = useState('300');
  const [paths, setPaths] = useState<Record<number, BancadaPaths>>(defaultPaths);

  const updatePath = (id: number, field: 'data' | 'fullData', value: string) => {
    setPaths(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h1 className="text-4xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-white/40 mt-2">Configure synchronization paths and system preferences.</p>
      </header>

      {/* Info Banner */}
      <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
        <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={20} />
        <div>
          <p className="text-amber-400 font-semibold text-sm">
            Configurações gerenciadas via arquivo <code className="bg-white/5 px-1 py-0.5 rounded text-xs">.env</code>
          </p>
          <p className="text-white/40 text-sm mt-1">
            Os caminhos reais são definidos em <code className="bg-white/5 px-1 py-0.5 rounded text-xs">sync/.env</code>.
            Esta tela exibe uma referência visual. Edite o <code className="bg-white/5 px-1 py-0.5 rounded text-xs">.env</code> para aplicar as mudanças no sync.
          </p>
        </div>
      </div>

      {/* Database Paths — uma seção por bancada */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-blue-500/10">
            <Database size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="font-bold text-white">Database Paths</h2>
            <p className="text-white/40 text-xs">Caminhos para os arquivos Access de cada bancada (Data e Full Data)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {BANCADAS.map((id, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="glass-card p-5 rounded-2xl space-y-4"
            >
              {/* Header da bancada */}
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <span className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                  {id}
                </span>
                <span className="font-semibold text-white/80">Bancada {id}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-white/30 uppercase tracking-widest mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                    Data (.accdb)
                  </label>
                  <input
                    type="text"
                    value={paths[id].data}
                    onChange={e => updatePath(id, 'data', e.target.value)}
                    placeholder={`C:\\...\\database${id}\\Data.accdb`}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-white/15"
                  />
                  <p className="text-[10px] text-white/20 mt-1 font-mono pl-1">
                    BD{id}_PATH (Data)
                  </p>
                </div>

                {/* Full Data */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-white/30 uppercase tracking-widest mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                    Full Data (.accdb)
                  </label>
                  <input
                    type="text"
                    value={paths[id].fullData}
                    onChange={e => updatePath(id, 'fullData', e.target.value)}
                    placeholder={`C:\\...\\database${id}\\Full Data.accdb`}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-white/15"
                  />
                  <p className="text-[10px] text-white/20 mt-1 font-mono pl-1">
                    BD{id}_PATH (Full Data)
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Sync Interval + Supabase Connection — grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6 rounded-3xl space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10">
              <Clock size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Sync Interval</h2>
              <p className="text-white/40 text-xs">Frequência de sincronização com o Supabase</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-1.5">
              Intervalo (segundos)
            </label>
            <input
              type="number"
              value={syncInterval}
              onChange={e => setSyncInterval(e.target.value)}
              min="60"
              max="3600"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
            <p className="text-white/30 text-xs mt-2">
              Atual: a cada{' '}
              <strong className="text-white/50">
                {Math.floor(Number(syncInterval) / 60)} min {Number(syncInterval) % 60}s
              </strong>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 rounded-3xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Server size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Supabase Connection</h2>
              <p className="text-white/40 text-xs">Status da conexão com o banco de dados cloud</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Project URL', value: 'dhmrrrftyijttnihurxn.supabase.co' },
              { label: 'API Key',     value: '••••••••••••••••••••••' },
              { label: 'Region',      value: 'us-east-1 (AWS)' },
              { label: 'Tables',      value: 'data, full_data' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-white/30 uppercase tracking-wider">{item.label}</span>
                <span className="text-xs font-mono text-white/60">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            <span className="text-xs text-emerald-400 font-semibold">Connected</span>
          </div>
        </motion.div>
      </div>

      {/* .env reference */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass-card p-6 rounded-3xl"
      >
        <h3 className="font-bold text-white/70 text-sm mb-3">Referência — sync/.env</h3>
        <pre className="bg-black/30 rounded-xl p-4 text-xs font-mono text-white/40 leading-relaxed overflow-x-auto">
{`# Supabase
SUPABASE_URL=https://dhmrrrftyijttnihurxn.supabase.co
SUPABASE_KEY=sua_chave_aqui

# Caminhos dos bancos (o script deriva Data e Full Data automaticamente)
BD1_PATH=C:\\Users\\User\\Documents\\BD\\database1\\Full Data.accdb
BD2_PATH=C:\\Users\\User\\Documents\\BD\\database2\\Full Data.accdb
BD3_PATH=C:\\Users\\User\\Documents\\BD\\database3\\Full Data.accdb
BD4_PATH=C:\\Users\\User\\Documents\\BD\\database4\\Full Data.accdb
BD5_PATH=C:\\Users\\User\\Documents\\BD\\database5\\Full Data.accdb`}
        </pre>
        <p className="text-white/20 text-xs mt-3">
          💡 O <code className="text-white/30">sync_bridge.py</code> deriva automaticamente os dois caminhos a partir do BD_PATH configurado — basta apontar para o diretório do banco.
        </p>
      </motion.div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-white text-black hover:bg-white/90'
          }`}
        >
          {saved ? <><CheckCircle2 size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}
