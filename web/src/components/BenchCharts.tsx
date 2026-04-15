"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const BENCH_COLORS = ['#60a5fa', '#818cf8', '#34d399', '#f59e0b', '#f87171'];

type TimeRange = '24h' | '30d' | '12m';

interface ChartDataPoint {
  label: string;
  [key: string]: number | string;
}

interface ChartsProps {
  bancadaIds?: number[];
}

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
  const [range, setRange] = useState<TimeRange>('24h');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      let since = new Date();
      let grouping: 'hour' | 'day' | 'week' = 'hour';

      if (range === '24h') {
        since.setHours(since.getHours() - 24);
        grouping = 'hour';
      } else if (range === '30d') {
        since.setDate(since.getDate() - 30);
        grouping = 'day';
      } else {
        since.setFullYear(since.getFullYear() - 1);
        grouping = 'week';
      }

      const sinceISO = since.toISOString();

      const results = await Promise.all(
        bancadaIds.map(async (bid) => {
          const { data } = await supabase
            .from('data')
            .select('timestamp, sync_at')
            .eq('bancada_id', bid)
            .gte('sync_at', sinceISO) // Usamos sync_at para garantir que dados novos apareçam no gráfico de "atividade recente"
            .order('sync_at', { ascending: true })
            .limit(5000); 
          return { bid, records: data || [] };
        })
      );

      const grouped: Record<string, ChartDataPoint> = {};

      // Inicializar pontos do gráfico para garantir continuidade
      if (range === '24h') {
        for (let i = 23; i >= 0; i--) {
          const d = new Date(Date.now() - i * 60 * 60 * 1000);
          const key = `${String(d.getHours()).padStart(2, '0')}:00`;
          grouped[key] = { label: key, ...Object.fromEntries(bancadaIds.map(id => [`B${id}`, 0])) };
        }
      } else if (range === '30d') {
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          grouped[key] = { label: key, ...Object.fromEntries(bancadaIds.map(id => [`B${id}`, 0])) };
        }
      } else {
        // Para 12 meses, simplificamos para os últimos 12 meses
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          grouped[key] = { label: key, ...Object.fromEntries(bancadaIds.map(id => [`B${id}`, 0])) };
        }
      }

      for (const { bid, records } of results) {
        for (const rec of records) {
          const date = new Date(rec.timestamp || rec.sync_at);
          let key = '';

          if (grouping === 'hour') {
            key = `${String(date.getHours()).padStart(2, '0')}:00`;
          } else if (grouping === 'day') {
            key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          } else {
            key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          }

          if (grouped[key]) {
            (grouped[key][`B${bid}`] as number) += 1;
          }
        }
      }

      setChartData(Object.values(grouped));
    } catch (e) {
      console.error('FETCH_CHART_ERROR:', e);
    } finally {
      setLoading(false);
    }
  }, [bancadaIds, range]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData, range]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-6 rounded-3xl space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10">
            <TrendingUp size={20} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="font-bold text-white">Production Activity</h2>
            <p className="text-white/40 text-xs">Analytics across multiple time ranges</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-xl w-fit">
          {(['24h', '30d', '12m'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                range === r ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {loading && chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={24} className="text-white/20 animate-spin" />
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
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                interval={range === '24h' ? 3 : range === '30d' ? 4 : 1}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2 }} />
              <Legend
                formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600 }}>{value}</span>}
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
