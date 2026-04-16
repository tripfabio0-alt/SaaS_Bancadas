"use client";

import Link from 'next/link';
import { LayoutDashboard, Database, Activity, Settings, HelpCircle, GitCommit, ListFilter } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';
import { supabase } from '@/lib/supabase';

interface BenchConfig {
  id: number;
  name: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [benches, setBenches] = useState<BenchConfig[]>([]);

  useEffect(() => {
    async function fetchBenches() {
      const { data } = await supabase
        .from('app_config')
        .select('benches_config')
        .eq('id', 1)
        .single();
      
      if (data?.benches_config) {
        setBenches(data.benches_config);
      }
    }
    fetchBenches();

    // Opcional: Realtime para atualizar o menu se os nomes mudarem
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_config' }, fetchBenches)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  return (
    <div className="w-64 h-screen glass-card border-r border-white/10 flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <h1 className="text-2xl font-bold gradient-text">SaaS Bancadas</h1>
        <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Industrial Monitoring</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
            pathname === '/'
              ? "bg-blue-600/20 text-blue-400 border border-blue-600/20"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <LayoutDashboard size={20} />
          <span className="font-medium">Overview</span>
        </Link>
        
        <Link
          href="/reports"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
            pathname === '/reports'
              ? "bg-blue-600/20 text-blue-400 border border-blue-600/20"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <Activity size={20} />
          <span className="font-medium">Global Union</span>
        </Link>

        <div className="pt-6 pb-2 flex items-center justify-between px-4">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Test Benches</p>
          <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
        </div>

        {benches.length === 0 ? (
           <div className="px-4 py-2 text-[10px] text-white/20 italic italic">Loading benches...</div>
        ) : benches.map((bench) => (
          <Link
            key={bench.id}
            href={`/bancada/${bench.id}`}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              pathname === `/bancada/${bench.id}`
                ? "bg-blue-600/20 text-blue-400 border border-blue-600/20"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Database size={18} />
            <span className="font-medium truncate">{bench.name}</span>
          </Link>
        ))}
      </nav>

      {/* Footer links + versão */}
      <div className="p-4 border-t border-white/10 space-y-1">
        <Link
          href="/changelog"
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
            pathname === '/changelog'
              ? "bg-blue-600/20 text-blue-400 border border-blue-600/20"
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <GitCommit size={16} />
          <span className="text-sm">Changelog</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
            pathname === '/settings'
              ? "bg-blue-600/20 text-blue-400 border border-blue-600/20"
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <Settings size={16} />
          <span className="text-sm">Settings</span>
        </Link>
        <Link
          href="/help"
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
            pathname === '/help'
              ? "bg-blue-600/20 text-blue-400 border border-blue-600/20"
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <HelpCircle size={16} />
          <span className="text-sm">Help Center</span>
        </Link>

        {/* Badge de versão */}
        <div className="mt-3 px-4 pt-3 border-t border-white/5">
          <Link
            href="/changelog"
            className="flex items-center justify-between group"
          >
            <span className="text-[10px] text-white/20 uppercase tracking-widest">Version</span>
            <span className="text-xs font-mono font-bold text-white/30 group-hover:text-blue-400 transition-colors bg-white/5 px-2 py-0.5 rounded-full border border-white/5 group-hover:border-blue-500/30 group-hover:bg-blue-500/10">
              v{APP_VERSION}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
