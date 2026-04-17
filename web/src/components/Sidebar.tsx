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
  Columns, 
  Settings2, 
  HelpCircle, 
  LogOut,
  Cpu,
  Activity
} from 'lucide-react';

const APP_VERSION = "2.0.0"; // Local fallback for stability

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

    const channel = supabase
      .channel('sidebar-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_config' }, fetchBenches)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Climate Monitoring', href: '/climate', icon: Thermometer },
    { label: 'Reports & Logs', href: '/reports', icon: BarChart3 },
    { label: 'Column Config', href: '/settings', icon: Columns },
    { label: 'System Settings', href: '/settings', icon: Settings2 },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-mid flex flex-col pt-8 pb-8 gap-2 shadow-[1px_0_0_0_rgba(69,70,77,0.15)] z-50">
      {/* Station Branding */}
      <div className="px-6 mb-8 text-nowrap overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
             <Cpu className="text-brand-primary" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-brand-primary font-headline leading-tight truncate">Bench Control</h2>
            <p className="text-[10px] uppercase tracking-widest text-[#dae2fd] opacity-60">Station ID: 08-A</p>
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label + item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium font-body",
                isActive 
                  ? "bg-surface-highest/40 text-brand-primary border-l-4 border-brand-secondary" 
                  : "text-[#dae2fd] opacity-70 hover:bg-surface-high hover:opacity-100"
              )}
            >
              <Icon 
                size={18}
                className={cn(
                  "transition-transform group-hover:scale-110 flex-shrink-0",
                  isActive ? "text-brand-primary" : "text-[#dae2fd]/60"
                )} 
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Live Benches */}
        <div className="pt-6 pb-2 px-4">
          <p className="text-[10px] font-bold text-[#dae2fd] opacity-30 uppercase tracking-[0.2em] mb-3">Live Benches</p>
          <div className="space-y-1">
            {benches.length === 0 ? (
               <div className="px-3 py-2 text-[10px] text-white/20 italic">Initializing benches...</div>
            ) : benches.map((bench) => {
              const benchHref = `/bancada/${bench.id}`;
              const isActive = pathname === benchHref;
              return (
                <Link
                  key={bench.id}
                  href={benchHref}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-xs font-medium",
                    isActive 
                      ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" 
                      : "text-[#dae2fd]/60 hover:text-white hover:bg-surface-high"
                  )}
                >
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full flex-shrink-0",
                     isActive ? "bg-brand-primary shadow-[0_0_8px_rgba(173,198,255,0.6)]" : "bg-white/20"
                   )} />
                  <span className="truncate">{bench.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-1 px-4">
        <Link 
          href="/help" 
          className="flex items-center gap-3 px-4 py-3 text-[#dae2fd] opacity-60 hover:bg-surface-high hover:opacity-100 rounded-xl transition-all text-sm font-medium"
        >
          <HelpCircle size={18} className="flex-shrink-0" />
          <span>Support Center</span>
        </Link>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-[#dae2fd] opacity-60 hover:bg-surface-high hover:text-brand-error transition-all text-sm font-medium rounded-xl">
          <LogOut size={18} className="flex-shrink-0" />
          <span>Logout System</span>
        </button>

        {/* Version Badge */}
        <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-between items-center">
          <span className="text-[10px] text-white/20 uppercase tracking-widest">Version</span>
          <span className="text-[10px] font-mono font-bold text-white/30 bg-surface-highest/50 px-2 py-0.5 rounded border border-outline-variant/10">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </aside>
  );
}
