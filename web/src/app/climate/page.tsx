"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

export default function ClimatePage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgTemp: 0,
    avgHum: 0,
    lastUpdate: null,
    status: 'Nominal'
  });
  const [range, setRange] = useState('24h');

  useEffect(() => {
    async function fetchData() {
      const { data: records, error } = await supabase
        .from('global_uniao')
        .select('*')
        .order('data_hora', { ascending: false })
        .limit(100);

      if (records) {
        setData(records);
        
        // Calcular médias
        const temps = records.filter(r => r.temperatura_celcius).map(r => parseFloat(r.temperatura_celcius));
        const hums = records.filter(r => r.umidade_percentual).map(r => parseFloat(r.umidade_percentual));
        
        const avgT = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length) : 0;
        const avgH = hums.length ? (hums.reduce((a, b) => a + b, 0) / hums.length) : 0;
        
        setStats({
          avgTemp: parseFloat(avgT.toFixed(1)),
          avgHum: parseFloat(avgH.toFixed(1)),
          lastUpdate: records[0]?.data_hora,
          status: avgT > 18 && avgT < 25 ? 'Optimal' : 'Checking'
        });
      }
    }

    fetchData();

    const channel = supabase
      .channel('climate-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'data' }, fetchData)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  // Preparar dados para o gráfico
  const chartData = [...data].reverse().map(r => ({
    time: format(new Date(r.data_hora), 'HH:mm'),
    temp: parseFloat(r.temperatura_celcius) || 0,
    hum: parseFloat(r.umidade_percentual) || 0,
  }));

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-brand-primary tracking-tight mb-2">
            Climate Monitoring
          </h1>
          <p className="text-[#dae2fd] opacity-60 font-medium">Environmental Stability Log — Lab Sensors</p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface-mid p-1.5 rounded-xl border border-outline-variant/10">
          {['24h', '7 Days', '30 Days'].map((t) => (
            <button
              key={t}
              onClick={() => setRange(t)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                range === t ? "bg-surface-highest text-brand-primary shadow-lg" : "text-[#dae2fd] opacity-50 hover:opacity-100"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column: Summary Cards */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          
          {/* Temperature Card */}
          <div className="bg-surface-mid p-6 rounded-xl border border-brand-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>device_thermostat</span>
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#dae2fd] opacity-40 mb-4 block">Average Temp (Lab)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-headline text-brand-primary">{stats.avgTemp}</span>
                <span className="text-xl font-medium text-[#dae2fd] opacity-40">°C</span>
              </div>
              <div className="mt-8 flex items-center gap-2">
                <div className="flex items-center gap-1 text-brand-tertiary text-xs font-bold">
                  <span className="material-symbols-outlined text-xs">trending_down</span>
                  0.4°
                </div>
                <span className="text-[10px] text-[#dae2fd] opacity-30 uppercase font-medium">vs last period</span>
              </div>
            </div>
          </div>

          {/* Humidity Card */}
          <div className="bg-surface-mid p-6 rounded-xl border border-brand-tertiary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>humidity_percentage</span>
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#dae2fd] opacity-40 mb-4 block">Average Humidity</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold font-headline text-brand-tertiary">{stats.avgHum}</span>
                <span className="text-xl font-medium text-[#dae2fd] opacity-40">%</span>
              </div>
              <div className="mt-8 flex items-center gap-2">
                <div className="flex items-center gap-1 text-brand-error text-xs font-bold">
                  <span className="material-symbols-outlined text-xs">trending_up</span>
                  2.1%
                </div>
                <span className="text-[10px] text-[#dae2fd] opacity-30 uppercase font-medium">vs last period</span>
              </div>
            </div>
          </div>

          {/* Status Label */}
          <div className="bg-surface-mid p-6 rounded-xl border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-tertiary shadow-[0_0_12px_rgba(137,206,255,0.6)] animate-pulse" />
              <span className="font-bold text-xs text-brand-tertiary uppercase tracking-wider">System Nominal</span>
            </div>
            <p className="text-xs text-[#dae2fd] opacity-50 leading-relaxed">
              Lab sensors (Labtemperature & Humidity) reporting within nominal tolerances.
            </p>
          </div>
        </div>

        {/* Right Column: Main Chart */}
        <div className="col-span-12 lg:col-span-9 bg-surface-mid rounded-xl border border-outline-variant/10 p-8 flex flex-col h-[500px]">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-bold font-headline text-white">Climate Flux Analysis</h3>
              <p className="text-sm text-[#dae2fd] opacity-40 italic">Historical data from industrial datalogger</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-primary" />
                <span className="text-xs font-semibold text-[#dae2fd]">Temp (°C)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-tertiary" />
                <span className="text-xs font-semibold text-[#dae2fd]">Hum (%)</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3449" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#45464d" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#45464d" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#131b2e', 
                    border: '1px solid #2d3449',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#dae2fd'
                  }}
                  itemStyle={{ color: '#adc6ff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="#adc6ff" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorTemp)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="hum" 
                  stroke="#89ceff" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorHum)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Measurement Log Table */}
        <div className="col-span-12 bg-surface-mid border border-outline-variant/10 rounded-xl overflow-hidden mt-6">
          <div className="p-6 flex justify-between items-center bg-surface-highest/20 border-b border-outline-variant/10">
            <h3 className="font-bold font-headline text-brand-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-brand-primary">history</span>
              Recent Environmental Log
            </h3>
            <button className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:bg-brand-primary/10 px-4 py-1.5 rounded-lg border border-brand-primary/20 transition-all">
              Export Archive
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[#dae2fd]/40 font-bold bg-surface-highest/10">
                  <th className="px-8 py-4">Datalogger Timestamp</th>
                  <th className="px-8 py-4">Bench / Station</th>
                  <th className="px-8 py-4 text-right">Temp (Labtemperature)</th>
                  <th className="px-8 py-4 text-right">Hum (Humidity)</th>
                  <th className="px-8 py-4 text-center">Stability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-highest/10 transition-colors group">
                    <td className="px-8 py-4 text-sm font-medium text-[#dae2fd]/80">
                      {format(new Date(row.data_hora), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-8 py-4 text-sm text-[#dae2fd]/40">
                      Bancada {row.bancada_id}
                    </td>
                    <td className="px-8 py-4 text-sm font-bold text-brand-primary text-right tracking-tight">
                      {row.temperatura_celcius}°C
                    </td>
                    <td className="px-8 py-4 text-sm font-bold text-brand-tertiary text-right tracking-tight">
                      {row.umidade_percentual}%
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-brand-tertiary/10 text-brand-tertiary text-[10px] font-bold uppercase tracking-wider">
                        Optimal
                      </span>
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
