import type { Cycle } from './types';
import { diffDays, parseDate } from './time';

const MONTH_STEP: Partial<Record<Cycle, number>> = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

/** 주기·기준일로 "오늘 해당 가능" 여부 계산 (6.2) */
export function isDue(cycle: Cycle, anchor: string | null, date: string): boolean {
  if (cycle === 'daily') return true;
  if (!anchor) return false;
  const diff = diffDays(date, anchor);
  if (cycle === 'weekly') return ((diff % 7) + 7) % 7 === 0;
  if (cycle === 'biweekly') return ((diff % 14) + 14) % 14 === 0;
  const step = MONTH_STEP[cycle]!;
  const a = parseDate(anchor);
  const d = parseDate(date);
  const months = (d.getUTCFullYear() - a.getUTCFullYear()) * 12 + (d.getUTCMonth() - a.getUTCMonth());
  if (((months % step) + step) % step !== 0) return false;
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const targetDay = Math.min(a.getUTCDate(), lastDay);
  return d.getUTCDate() === targetDay;
}
