import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma data de forma segura, evitando crashes por datas inválidas ou nulas.
 * @param date Data original (string, number ou Date)
 * @param formatStr Padrão de formatação (ex: 'dd/MM/yyyy')
 * @returns String formatada ou '-' se for inválida
 */
export function formatSafeDate(date: any, formatStr: string): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (!isValid(d)) return '-';
    return format(d, formatStr);
  } catch (e) {
    return '-';
  }
}
