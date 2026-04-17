"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { cn, formatSafeDate } from '@/lib/utils';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Thermometer, 
  Droplets, 
  TrendingDown, 
  TrendingUp, 
  History,
  Activity 
} from 'lucide-react';

export default function ClimatePage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgTemp: 0,
    avgHum: 0,
    tempTrend: '+0.2',
    humTrend: '-1.5'
  });

  const fetchData = async () => {
    try {
      const { data: records, error } = await supabase
        .from('global_uniao')
        .select('data_hora, temperatura_celcius, umidade_percentual, id_mark, bancada_id')
        .order('data_hora', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (records) {
        // Formatar para o gráfico (reverso para ordem cronológica)
        const chartFormatted = [...records].reverse().map(r => ({
          time: formatSafeDate(r.data_hora, 'HH:mm'),
          temp: parseFloat(r.temperatura_celcius) || 0,
          hum: parseFloat(r.umidade_percentual) || 0
        })).filter(r => r.time !== '-');
        
        setData(chartFormatted);

        // Calcular médias com segurança contra NaN
        const temps = records.map(r => parseFloat(r.temperatura_celcius)).filter(v => !isNaN(v));
        const hums = records.map(r => parseFloat(r.umidade_percentual)).filter(v => !isNaN(v));
        
        setStats({
          avgTemp: temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length) : 0,
          avgHum: hums.length ? (hums.reduce((a, b) => a + b, 0) / hums.length) : 0,
          tempTrend: '+0.4',
          humTrend: '+2.1'
        });
      }
    } catch (err) {
      console.error('Erro clima:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight">Monitoramento Climático</h1>
          <p className="text-[#dae2fd] opacity-40 mt-2 max-w-2xl">Acompanhamento em tempo real das condições ambientais do laboratório.</p>
        </div>
        <div className="flex items-center gap-4 bg-surface-mid p-2 rounded-xl border border-outline-variant/10 text-brand-primary">
           <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
           <span className="text-[10px] font-bold uppercase tracking-widest">Sensores em Tempo Real</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Stats Column */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          <div className="bg-surface-mid p-6 rounded-xl border border-brand-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Thermometer size={80} className="text-brand-primary" />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#dae2fd] opacity-40 mb-4 block">Média Temp.</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-headline text-brand-primary">{(Number(stats.avgTemp) || 0).toFixed(1)}</span>
                <span className="text-xl font-medium text-[#dae2fd] opacity-40">°C</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-mid p-6 rounded-xl border border-brand-tertiary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Droplets size={80} className="text-brand-tertiary" />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#dae2fd] opacity-40 mb-4 block">Umidade Média</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-headline text-brand-tertiary">{(Number(stats.avgHum) || 0).toFixed(1)}</span>
                <span className="text-xl font-medium text-[#dae2fd] opacity-40">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Column */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 h-[500px] shadow-2xl relative overflow-hidden">
             <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-surface-highest/50 rounded-xl flex items-center justify-center text-brand-primary">
                      <Activity size={20} />
                   </div>
                   <h3 className="text-lg font-bold text-white font-headline">Variação Climática</h3>
                </div>
             </div>

             <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="time" stroke="rgba(218,226,253,0.3)" fontSize={10} axisLine={false} />
                      <YAxis stroke="rgba(218,226,253,0.3)" fontSize={10} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="temp" stroke="#adc6ff" fillOpacity={0.1} fill="#adc6ff" />
                      <Area type="monotone" dataKey="hum" stroke="#89ceff" fillOpacity={0.1} fill="#89ceff" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Table Footer */}
        <div className="col-span-12 bg-surface-mid border border-outline-variant/10 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-highest/10 font-bold text-[10px] text-[#dae2fd]/30 uppercase tracking-widest">
                <th className="px-8 py-4">Data/Hora</th>
                <th className="px-8 py-4">Temp</th>
                <th className="px-8 py-4">Hum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {data.slice(0, 5).map((log, i) => (
                <tr key={i} className="text-xs text-[#dae2fd]/60">
                  <td className="px-8 py-4 font-mono">{log.time}</td>
                  <td className="px-8 py-4 font-bold text-brand-primary">{log.temp.toFixed(1)}°C</td>
                  <td className="px-8 py-4 font-bold text-brand-tertiary">{log.hum.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
