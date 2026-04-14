"use client";

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Wifi, WifiOff, Clock } from 'lucide-react';
import { useState } from 'react';

export interface Notification {
  id: string;
  type: 'offline' | 'idle' | 'online';
  bancadaId: number;
  message: string;
  timestamp: Date;
}

const TYPE_CONFIG = {
  offline: {
    icon: WifiOff,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-500',
  },
  idle: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    dot: 'bg-yellow-500',
  },
  online: {
    icon: Wifi,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    dot: 'bg-green-500',
  },
};

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const cfg = TYPE_CONFIG[notification.type];
  const Icon = cfg.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 6000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex items-start gap-3 p-4 rounded-2xl border ${cfg.bg} ${cfg.border} backdrop-blur-xl shadow-2xl w-80 max-w-full`}
    >
      <div className={`p-2 rounded-xl ${cfg.bg} shrink-0`}>
        <Icon size={16} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${cfg.color}`}>Bancada {notification.bancadaId}</p>
        <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{notification.message}</p>
        <p className="text-[10px] text-white/20 mt-1 font-mono">
          {notification.timestamp.toLocaleTimeString()}
        </p>
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="text-white/20 hover:text-white/60 transition-colors shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prevStatus = useRef<Record<number, string>>({});

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp'>) => {
    setNotifications(prev => [
      { ...n, id: `${Date.now()}-${n.bancadaId}`, timestamp: new Date() },
      ...prev.slice(0, 4), // máximo 5 notificações visíveis
    ]);
  }, []);

  useEffect(() => {
    const checkStatuses = async () => {
      const { data } = await supabase
        .from('data')
        .select('bancada_id, sync_at')
        .in('bancada_id', [1, 2, 3, 4, 5])
        .order('sync_at', { ascending: false });

      if (!data) return;

      // Pegar o sync_at mais recente por bancada
      const latestByBancada: Record<number, string> = {};
      for (const row of data) {
        if (!latestByBancada[row.bancada_id]) {
          latestByBancada[row.bancada_id] = row.sync_at;
        }
      }

      const now = Date.now();
      for (const id of [1, 2, 3, 4, 5]) {
        const ts = latestByBancada[id];
        let status: string;

        if (!ts) {
          status = 'offline';
        } else {
          // Usar sync_at para determinar status
          const diff = (now - new Date(ts).getTime()) / (1000 * 60);
          status = diff < 15 ? 'online' : diff < 120 ? 'idle' : 'offline';
        }

        const prev = prevStatus.current[id];

        if (prev !== undefined && prev !== status) {
          // Transição de status detectada
          if (status === 'offline') {
            addNotification({
              type: 'offline',
              bancadaId: id,
              message: 'Bancada ficou offline. Último registro há mais de 2 horas.',
            });
          } else if (status === 'idle' && prev === 'online') {
            addNotification({
              type: 'idle',
              bancadaId: id,
              message: 'Bancada entrou em modo idle (sem atividade recente).',
            });
          } else if (status === 'online' && prev !== 'online') {
            addNotification({
              type: 'online',
              bancadaId: id,
              message: 'Bancada voltou a operar normalmente.',
            });
          }
        }

        prevStatus.current[id] = status;
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 60 * 1000); // checar a cada 1 min
    return () => clearInterval(interval);
  }, [addNotification]);

  return { notifications, dismiss };
}

export function NotificationCenter({ notifications, onDismiss }: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => (
          <NotificationToast key={n.id} notification={n} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
