"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Thermometer, 
  BarChart3, 
  Settings2, 
  HelpCircle, 
  LogOut,
  Cpu
} from 'lucide-react';

const APP_VERSION = "2.0.2"; 

interface BenchConfig {
  id: number;
  name: string;
  isOnline?: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [benches, setBenches] = useState<BenchConfig[]>([]);

  const fetchBenches = async () => {
    const { data } = await supabase.from('app_config').select('benches_config').eq('id', 1).single();
    
    if (data?.benches_config) {
      const benchConfigs = data.benches_config;
      
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
    }
  };

  useEffect(() => {
    fetchBenches();
    const interval = setInterval(fetchBenches, 60000); // Atualiza status a cada minuto
    return () => { clearInterval(interval); };
  }, []);

  const navItems = [
    { label: 'Painel de Controle', href: '/', icon: LayoutDashboard },
    { label: 'Monitoramento Climático', href: '/climate', icon: Thermometer },
    { label: 'Relatórios e Registros', href: '/reports', icon: BarChart3 },
    { label: 'Configurações', href: '/settings', icon: Settings2 },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-mid flex flex-col pt-8 pb-8 gap-2 shadow-[1px_0_0_0_rgba(69,70,77,0.15)] z-50 transition-colors">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
             <Cpu className="text-brand-primary" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-primary font-headline leading-tight">SaaS Bancadas</h2>
            <p className="text-[10px] uppercase font-bold tracking-widest text-brand-tertiary">Industrial Sync</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold font-body",
              isActive ? "bg-brand-primary/10 text-brand-primary" : "text-white/40 hover:bg-white/5 hover:text-white"
            )}>
              <Icon size={18} className={isActive ? "text-brand-primary" : "opacity-40"} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-6 pb-2 px-4">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-3">Status de Nós</p>
          <div className="space-y-1">
            {benches.map((bench) => {
              const benchHref = `/bancada/${bench.id}`;
              const isActive = pathname === benchHref;
              return (
                <Link key={bench.id} href={benchHref} className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-xs font-bold",
                  isActive ? "bg-white/5 text-white" : "text-white/30 hover:text-white"
                )}>
                   <div className={cn(
                     "w-2 h-2 rounded-full",
                     bench.isOnline ? "bg-brand-tertiary shadow-[0_0_8px_#4ade80]" : "bg-brand-error shadow-[0_0_8px_#f87171]"
                   )} />
                  <span className="truncate">{bench.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-auto px-4 pt-4 border-t border-outline-variant/10">
        <div className="flex justify-between items-center text-[9px] uppercase font-bold tracking-widest text-white/20">
          <span>Versão SaaS</span>
          <span className="bg-surface-highest px-2 py-0.5 rounded text-white/40">v{APP_VERSION}</span>
        </div>
      </div>
    </aside>
  );
}
