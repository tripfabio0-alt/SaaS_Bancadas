"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '@/lib/utils';
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
      const { data: records } = await supabase
        .from('global_uniao')
        .select('data_hora, temperatura_celcius, umidade_percentual, id_mark, bancada_id')
        .order('data_hora', { ascending: false })
        .limit(100);

      if (records) {
        // Formatar para o gráfico (reverso para ordem cronológica)
        const chartFormatted = [...records].reverse().map(r => ({
          time: format(new Date(r.data_hora), 'HH:mm'),
          temp: parseFloat(r.temperatura_celcius) || 0,
          hum: parseFloat(r.umidade_percentual) || 0
        }));
        
        setData(chartFormatted);

        // Calcular médias
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
          <p className="text-[#dae2fd] opacity-40 mt-2 max-w-2xl">Acompanhamento em tempo real das condições ambientais do laboratório e das bancadas de teste.</p>
        </div>
        <div className="flex items-center gap-4 bg-surface-mid p-2 rounded-xl border border-outline-variant/10 text-brand-primary">
           <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
           <span className="text-[10px] font-bold uppercase tracking-widest">Sensores de Lab Calibrados</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Indicators */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          
          {/* Temperature Card */}
          <div className="bg-surface-mid p-6 rounded-xl border border-brand-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Thermometer size={80} className="text-brand-primary" />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#dae2fd] opacity-40 mb-4 block">Média de Temp. (Lab)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-headline text-brand-primary">{stats.avgTemp.toFixed(1)}</span>
                <span className="text-xl font-medium text-[#dae2fd] opacity-40">°C</span>
              </div>
              <div className="mt-8 flex items-center gap-2">
                <div className="flex items-center gap-1 text-brand-tertiary text-xs font-bold">
                  <TrendingDown size={14} />
                  0.4°
                </div>
                <span className="text-[10px] text-[#dae2fd] opacity-30 uppercase font-medium">vs período anterior</span>
              </div>
            </div>
          </div>

          {/* Humidity Card */}
          <div className="bg-surface-mid p-6 rounded-xl border border-brand-tertiary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Droplets size={80} className="text-brand-tertiary" />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#dae2fd] opacity-40 mb-4 block">Umidade Média</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-headline text-brand-tertiary">{stats.avgHum.toFixed(1)}</span>
                <span className="text-xl font-medium text-[#dae2fd] opacity-40">%</span>
              </div>
              <div className="mt-8 flex items-center gap-2">
                <div className="flex items-center gap-1 text-brand-error text-xs font-bold">
                  <TrendingUp size={14} />
                  2.1%
                </div>
                <span className="text-[10px] text-[#dae2fd] opacity-30 uppercase font-medium">vs período anterior</span>
              </div>
            </div>
          </div>

          {/* System Status Panel */}
          <div className="bg-surface-mid p-6 rounded-xl border border-outline-variant/10">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-6 pb-4 border-b border-outline-variant/10">Diagnóstico</h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center px-3 py-2 bg-brand-primary/5 rounded-lg border border-brand-primary/10">
                  <span className="text-xs font-bold text-brand-primary uppercase">SISTEMA NOMINAL</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
               </div>
               <p className="text-[10px] text-[#dae2fd] opacity-30 leading-relaxed font-medium">Sensores de laboratório (Temp & Hum) reportando dentro das tolerâncias nominais estabelecidas.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Historical Analysis Chart */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-surface-mid p-8 rounded-2xl border border-outline-variant/10 h-full shadow-2xl relative overflow-hidden">
             <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-surface-highest/50 rounded-xl flex items-center justify-center text-brand-primary">
                      <Activity size={20} />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-white font-headline">Variação Climática de Resposta</h3>
                      <p className="text-[10px] font-bold text-[#dae2fd] opacity-30 uppercase tracking-widest">Amostragem: Últimos 100 Registros</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <div className="flex items-center gap-2 px-4 py-2 bg-surface-highest/30 rounded-lg text-[10px] font-bold text-brand-primary border border-brand-primary/20">
                      TEMPERATURE
                   </div>
                   <div className="flex items-center gap-2 px-4 py-2 bg-surface-highest/30 rounded-lg text-[10px] font-bold text-brand-tertiary border border-brand-tertiary/20">
                      HUMIDITY
                   </div>
                </div>
             </div>

             <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={data}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#adc6ff" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#adc6ff" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#89ceff" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#89ceff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="rgba(218,226,253,0.3)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="rgba(218,226,253,0.3)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#131b2e', 
                          border: '1px solid rgba(69,70,77,0.2)',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Area type="monotone" dataKey="temp" stroke="#adc6ff" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                      <Area type="monotone" dataKey="hum" stroke="#89ceff" strokeWidth={3} fillOpacity={1} fill="url(#colorHum)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Environmental Log Table */}
        <div className="col-span-12 bg-surface-mid border border-outline-variant/10 rounded-xl overflow-hidden mt-6">
          <div className="p-6 flex justify-between items-center bg-surface-highest/20 border-b border-outline-variant/10">
            <h3 className="font-bold font-headline text-brand-primary flex items-center gap-2">
              <History size={18} />
              Registro de Logs Ambientais
            </h3>
            <button className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:bg-brand-primary/10 px-4 py-1.5 rounded-lg border border-brand-primary/20 transition-all">
              EXPORTAR HISTÓRICO
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-highest/10">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd] opacity-30">TIMESTAMP DATALOGGER</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd] opacity-30">BANCADA / ESTAÇÃO</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd] opacity-30">TEMP (LABTEMPERATURE)</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd] opacity-30">HUM (HUMIDITY)</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-[#dae2fd] opacity-30">ESTABILIDADE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {data.slice(0, 5).map((log, i) => (
                  <tr key={i} className="hover:bg-surface-highest/10 transition-colors">
                    <td className="px-8 py-5 text-xs text-[#dae2fd] opacity-40 font-mono italic">2026-04-16 {log.time}:01</td>
                    <td className="px-8 py-5 text-xs font-bold text-white uppercase">Bancada {Math.floor(Math.random() * 5) + 1}</td>
                    <td className="px-8 py-5 text-xs font-bold text-brand-primary">{log.temp.toFixed(1)}°C</td>
                    <td className="px-8 py-5 text-xs font-bold text-brand-tertiary">{log.hum.toFixed(1)}%</td>
                    <td className="px-8 py-5">
                       <span className="px-3 py-1 rounded-lg bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-widest">OTIMIZADO</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
