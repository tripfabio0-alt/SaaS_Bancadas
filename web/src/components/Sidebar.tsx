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

const APP_VERSION = "2.0.4"; 

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
        // TOLERÂNCIA INDUSTRIAL DE 3 HORAS (180 minutos)
        const isOnline = lastSync ? (Date.now() - new Date(lastSync).getTime() < 180 * 60 * 1000) : false;
        return { ...b, isOnline };
      });
      
      const resolvedBenches = await Promise.all(benchStatusPromises);
      setBenches(resolvedBenches);
    }
  };

  useEffect(() => {
    fetchBenches();
    const interval = setInterval(fetchBenches, 60000); 
    return () => { clearInterval(interval); };
  }, []);

  const navItems = [
    { label: 'Painel de Controle', href: '/', icon: LayoutDashboard },
    { label: 'Monitoramento Climático', href: '/climate', icon: Thermometer },
    { label: 'Relatórios e Registros', href: '/reports', icon: BarChart3 },
    { label: 'Configurações', href: '/settings', icon: Settings2 },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-mid flex flex-col pt-8 pb-8 gap-2 shadow-[1px_0_0_0_rgba(69,70,77,0.15)] z-50 transition-all border-r border-outline-variant/10">
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
              isActive ? "bg-brand-primary/10 text-brand-primary shadow-sm" : "text-text-sub hover:bg-surface-highest/5 hover:text-text-main"
            )}>
              <Icon size={18} className={isActive ? "text-brand-primary" : "opacity-40"} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-6 pb-2 px-4 shadow-sm">
          <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mb-3">Nós em Operação</p>
          <div className="space-y-1">
            {benches.map((bench) => {
              const benchHref = `/bancada/${bench.id}`;
              const isActive = pathname === benchHref;
              return (
                <Link key={bench.id} href={benchHref} className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-xs font-bold",
                  isActive ? "bg-surface-highest/20 text-text-main" : "text-text-sub hover:text-text-main hover:bg-surface-highest/10"
                )}>
                   <div className={cn(
                     "w-2.5 h-2.5 rounded-full transition-shadow duration-500",
                     bench.isOnline ? "bg-brand-tertiary shadow-[0_0_10px_#4ade80]" : "bg-brand-error shadow-[0_0_10px_#f87171]"
                   )} />
                  <span className="truncate">{bench.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-auto px-4 pt-4 border-t border-outline-variant/10">
        <div className="flex justify-between items-center text-[9px] uppercase font-bold tracking-widest text-text-dim">
          <span>Infraestrutura SaaS</span>
          <span className="bg-surface-highest px-2 py-0.5 rounded">v{APP_VERSION}</span>
        </div>
      </div>
    </aside>
  );
}
