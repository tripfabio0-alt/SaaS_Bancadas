"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2 } from 'lucide-react';

const BENCH_COLORS = ['#60a5fa', '#818cf8', '#34d399', '#f59e0b', '#f87171'];

interface ChartDataPoint {
  hour: string;
  [key: string]: number | string;
}

interface ChartsProps {
  bancadaIds?: number[];
}

// Tooltip customizado com glassmorphism
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 rounded-xl border border-white/10 text-xs space-y-1">
      <p className="text-white/50 font-mono mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-white/60">{entry.name}:</span>
          <span className="text-white font-bold">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function BenchCharts({ bancadaIds = [1, 2, 3, 4, 5] }: ChartsProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar registros das últimas 24h agrupados por hora e bancada
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const results = await Promise.all(
        bancadaIds.map(async (bid) => {
          const { data } = await supabase
            .from('data')
            .select('timestamp, sync_at')
            .eq('bancada_id', bid)
            .gte('sync_at', since)
            .order('sync_at', { ascending: true })
            .limit(1000); 
          return { bid, records: data || [] };
        })
      );

      // Agrupar por hora
      const hours: Record<string, ChartDataPoint> = {};

      for (let i = 23; i >= 0; i--) {
        const d = new Date(Date.now() - i * 60 * 60 * 1000);
        const key = `${String(d.getHours()).padStart(2, '0')}:00`;
        hours[key] = { hour: key, ...Object.fromEntries(bancadaIds.map(id => [`B${id}`, 0])) };
      }

      for (const { bid, records } of results) {
        for (const rec of records) {
          // Usar timestamp original mas tratar possíveis formatos
          let date;
          try {
            // Se o timestamp for string ISO ou formato reconhecido
            date = new Date(rec.timestamp);
            
            // Fallback se o timestamp do banco estiver incompleto ou inválido
            if (isNaN(date.getTime())) {
              date = new Date(rec.sync_at);
            }
          } catch {
            date = new Date(rec.sync_at);
          }

          const key = `${String(date.getHours()).padStart(2, '0')}:00`;
          if (hours[key]) {
            (hours[key][`B${bid}`] as number) += 1;
          }
        }
      }

      setChartData(Object.values(hours));
    } catch (e) {
      console.error('Erro ao buscar dados do gráfico:', e);
    } finally {
      setLoading(false);
    }
  }, [bancadaIds]);

  useEffect(() => {
    fetchChartData();
    const interval = setInterval(fetchChartData, 5 * 60 * 1000); // atualiza a cada 5min
    return () => clearInterval(interval);
  }, [fetchChartData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-6 rounded-3xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10">
            <TrendingUp size={20} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="font-bold text-white">Production Activity</h2>
            <p className="text-white/40 text-xs">Records synced per hour — last 24h</p>
          </div>
        </div>
        {loading && <Loader2 size={16} className="text-white/30 animate-spin" />}
      </div>

      <div className="h-64">
        {loading && chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/20 text-sm">Loading chart data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                {bancadaIds.map((id, i) => (
                  <linearGradient key={id} id={`grad${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BENCH_COLORS[i]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={BENCH_COLORS[i]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="hour"
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2 }} />
              <Legend
                formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{value}</span>}
                wrapperStyle={{ paddingTop: 12 }}
              />
              {bancadaIds.map((id, i) => (
                <Area
                  key={id}
                  type="monotone"
                  dataKey={`B${id}`}
                  name={`Bancada ${id}`}
                  stroke={BENCH_COLORS[i]}
                  strokeWidth={2}
                  fill={`url(#grad${id})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
