"use client";

import { Activity, Clock, Database, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const STATS = [
  { label: 'Active Benches', value: '5/5', icon: Activity, color: 'text-green-400' },
  { label: 'Total Records', value: '124,502', icon: Database, color: 'text-blue-400' },
  { label: 'Last Sync', value: '2 mins ago', icon: Clock, color: 'text-purple-400' },
  { label: 'Health Status', value: 'Optimal', icon: CheckCircle2, color: 'text-emerald-400' },
];

const BANCADAS = [
  { id: 1, name: 'Bancada 1', location: 'Laboratório Gas', status: 'Online', records: '24k', lastUpdate: '10:45 AM' },
  { id: 2, name: 'Bancada 2', location: 'Small Flow - D', status: 'Online', records: '18k', lastUpdate: '10:42 AM' },
  { id: 3, name: 'Bancada 3', location: 'Small Flow - C', status: 'Online', records: '31k', lastUpdate: '10:39 AM' },
  { id: 4, name: 'Bancada 4', location: 'Small Flow - E', status: 'Online', records: '12k', lastUpdate: '10:41 AM' },
  { id: 5, name: 'Bancada 5', location: 'Bancada Gas 4', status: 'Online', records: '39k', lastUpdate: '10:44 AM' },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold text-white tracking-tight">System Overview</h1>
        <p className="text-white/40 mt-2">Real-time status of industrial test benches and database synchronization.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-2xl group hover:border-white/20 transition-all cursor-default"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-white/40 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Benches Table */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Active Test Benches</h2>
          <button className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">View All Details</button>
        </div>
        
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Bench Name</th>
                <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Records</th>
                <th className="px-6 py-4 text-xs font-bold text-white/30 uppercase tracking-widest">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {BANCADAS.map((bench, i) => (
                <motion.tr 
                  key={bench.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      <span className="font-medium">{bench.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/60">{bench.location}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-bold">
                      {bench.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/60 font-mono text-sm">{bench.records}</td>
                  <td className="px-6 py-4 text-white/40 text-sm">{bench.lastUpdate}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* System Health Card */}
      <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
        <div className="relative z-10 w-full md:w-2/3">
          <h2 className="text-2xl font-bold">Ready for Production</h2>
          <p className="text-white/60 mt-2 mb-6 text-lg">
            All 5 databases are currently synchronized with the cloud bridge. You can access historical full data logs for deeper analysis.
          </p>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all">Download Report</button>
            <button className="px-6 py-3 bg-white/5 border border-white/10 font-bold rounded-xl hover:bg-white/10 transition-all text-white">Full Settings</button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full" />
      </div>
    </div>
  );
}
