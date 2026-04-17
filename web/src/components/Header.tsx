"use client";

import { useState } from 'react';
import { Search, Globe, Moon, Sun, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Header() {
  const [isDark, setIsDark] = useState(true);

  return (
    <header className="fixed top-0 w-full z-40 bg-surface-low/80 backdrop-blur-md flex justify-between items-center px-6 py-4 pl-72 border-b border-outline-variant/10">
      <div className="flex items-center gap-8">
        <div className="text-2xl font-bold tracking-tighter text-brand-primary font-headline">Industrial Bench SaaS</div>
        
        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-surface-highest/30 px-4 py-2 rounded-full border border-outline-variant/10 group focus-within:border-brand-primary/30 transition-all">
          <Search className="text-[#dae2fd] opacity-40 mr-2" size={16} />
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm text-[#dae2fd] w-48 placeholder:text-[#dae2fd]/30 font-body" 
            placeholder="Procurar instrumentação..." 
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Region Toggle */}
        <div className="flex items-center bg-surface-highest/50 rounded-full p-1 h-9">
          <button className="px-3 py-1 rounded-full text-[10px] font-bold bg-brand-primary text-brand-primary-foreground shadow-lg">PT-BR</button>
          <button className="px-3 py-1 rounded-full text-[10px] font-bold text-[#dae2fd] opacity-40 hover:opacity-100 transition-all">EN</button>
        </div>

        <div className="flex items-center gap-2">
           <button className="p-2 text-[#dae2fd] opacity-70 hover:bg-surface-highest hover:opacity-100 transition-all rounded-lg">
             <Globe size={18} />
           </button>
           <button 
             onClick={() => setIsDark(!isDark)}
             className="p-2 text-[#dae2fd] opacity-70 hover:bg-surface-highest hover:opacity-100 transition-all rounded-lg"
           >
             {isDark ? <Sun size={18} /> : <Moon size={18} />}
           </button>
        </div>

        {/* User Profile */}
        <div className="h-9 w-9 rounded-full overflow-hidden border border-brand-primary/20 bg-surface-high flex items-center justify-center cursor-pointer hover:border-brand-primary transition-all">
          <User size={18} className="text-brand-primary" />
        </div>
      </div>
    </header>
  );
}
