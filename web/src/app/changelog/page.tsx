"use client";

import { motion } from 'framer-motion';
import { Tag, GitCommit, Zap, Wrench, Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CHANGELOG, APP_VERSION, VersionEntry } from '@/lib/version';

const TYPE_CONFIG = {
  major: { label: 'Major', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  minor: { label: 'Minor', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  patch: { label: 'Patch', color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20'},
  fix:   { label: 'Fix',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
};

const CHANGE_ICON = {
  feat:  { icon: Zap,       color: 'text-blue-400'    },
  fix:   { icon: Wrench,    color: 'text-amber-400'   },
  chore: { icon: Package,   color: 'text-white/30'    },
};

function VersionCard({ entry, index, isLatest }: { entry: VersionEntry; index: number; isLatest: boolean }) {
  const tc = TYPE_CONFIG[entry.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`glass-card rounded-3xl overflow-hidden ${isLatest ? 'border border-blue-500/20' : ''}`}
    >
      {/* Header */}
      <div className={`px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 ${isLatest ? 'bg-blue-500/5' : 'bg-white/[0.02]'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/5">
            <Tag size={16} className={isLatest ? 'text-blue-400' : 'text-white/40'} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xl font-bold font-mono ${isLatest ? 'text-white' : 'text-white/70'}`}>
                v{entry.version}
              </h2>
              {isLatest && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                  Current
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tc.bg} ${tc.color} ${tc.border}`}>
                {tc.label}
              </span>
            </div>
          </div>
        </div>
        <span className="text-xs text-white/30 font-mono">{entry.date}</span>
      </div>

      {/* Changes */}
      <ul className="px-6 py-5 space-y-3">
        {entry.changes.map((change, i) => {
          const { icon: Icon, color } = CHANGE_ICON[change.type];
          return (
            <li key={i} className="flex items-start gap-3">
              <Icon size={14} className={`${color} mt-0.5 shrink-0`} />
              <span className="text-sm text-white/60 leading-relaxed">{change.description}</span>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

export default function ChangelogPage() {
  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <GitCommit size={20} className="text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Changelog</h1>
          </div>
          <p className="text-white/40 mt-1">Histórico de versões e atualizações do SaaS Bancadas.</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-white/30 uppercase tracking-widest">Versão atual</p>
          <p className="text-3xl font-bold font-mono text-white mt-1">v{APP_VERSION}</p>
        </div>
      </header>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Releases', value: CHANGELOG.length },
          { label: 'Features',  value: CHANGELOG.flatMap(c => c.changes).filter(c => c.type === 'feat').length },
          { label: 'Bug Fixes', value: CHANGELOG.flatMap(c => c.changes).filter(c => c.type === 'fix').length  },
          { label: 'Major Versions', value: CHANGELOG.filter(c => c.type === 'major').length },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card p-4 rounded-2xl text-center"
          >
            <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-white/30 mt-1 uppercase tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Timeline */}
      <div className="relative space-y-6">
        {/* Linha vertical decorativa */}
        <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gradient-to-b from-blue-500/30 via-white/10 to-transparent hidden md:block" />

        {CHANGELOG.map((entry, i) => (
          <div key={entry.version} className="md:pl-8 relative">
            {/* Dot na linha do tempo */}
            <div className={`absolute left-0 top-5 w-[22px] h-[22px] rounded-full border-2 hidden md:flex items-center justify-center ${i === 0 ? 'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-[#0a0a0a] border-white/10'}`}>
              <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/20'}`} />
            </div>
            <VersionCard entry={entry} index={i} isLatest={i === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}
