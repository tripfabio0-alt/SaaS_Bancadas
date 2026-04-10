"use client";

import Link from 'next/link';
import { LayoutDashboard, Database, Activity, Settings, HelpCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const BANCADAS = [
  { id: 1, name: 'Bancada 1', icon: Activity },
  { id: 2, name: 'Bancada 2', icon: Activity },
  { id: 3, name: 'Bancada 3', icon: Activity },
  { id: 4, name: 'Bancada 4', icon: Activity },
  { id: 5, name: 'Bancada 5', icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen glass-card border-r border-white/10 flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold gradient-text">SaaS Bancadas</h1>
        <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Industrial Monitoring</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        <Link 
          href="/" 
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
            pathname === '/' ? "bg-blue-600/20 text-blue-400 border border-blue-600/20" : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <LayoutDashboard size={20} />
          <span className="font-medium">Overview</span>
        </Link>

        <div className="pt-8 pb-4">
          <p className="px-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Test Benches</p>
        </div>

        {BANCADAS.map((bench) => (
          <Link 
            key={bench.id}
            href={`/bancada/${bench.id}`} 
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              pathname === `/bancada/${bench.id}` ? "bg-blue-600/20 text-blue-400 border border-blue-600/20" : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Database size={18} />
            <span className="font-medium">{bench.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-white/10 space-y-1">
        <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-white/40 hover:text-white transition-colors">
          <Settings size={18} />
          <span className="text-sm">Settings</span>
        </Link>
        <Link href="/help" className="flex items-center gap-3 px-4 py-2 text-white/40 hover:text-white transition-colors">
          <HelpCircle size={18} />
          <span className="text-sm">Help Center</span>
        </Link>
      </div>
    </div>
  );
}
