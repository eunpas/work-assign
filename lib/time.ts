import type { Absence } from './types';

export const SLOT_COUNT = 54; // 08:00 ~ 16:50, 10분 칸
export const DAY_START = 8 * 60;
export const DAY_END = 17 * 60;
/** 작업 가능 구간 [시작칸, 끝칸) — 08:00–12:00, 13:00–16:00 */
export const BLOCKS: [number, number][] = [
  [0, 24],
  [30, 48],
];

const pad = (n: number) => String(n).padStart(2, '0');

export function minToTime(m: number) {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
export function slotToTime(s: number) {
  return minToTime(DAY_START + s * 10);
}
export function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
export function breakOf(s: number): '점심' | '체육' | null {
  if (s >= 24 && s < 30) return '점심';
  if (s >= 48) return '체육';
  return null;
}

/** 30분 단위 시각 목록 08:00 ~ 17:00 */
export const HALF_HOURS: string[] = Array.from({ length: 19 }, (_, i) => minToTime(DAY_START + i * 30));

export function isHalfHour(t: string) {
  if (!/^\d{2}:\d{2}$/.test(t)) return false;
  const m = timeToMin(t);
  return m >= DAY_START && m <= DAY_END && m % 30 === 0;
}

/** 특정 날짜에 이 부재가 차지하는 [시작분, 종료분) — 없으면 null */
export function absenceRangeOn(a: Absence, date: string): [number, number] | null {
  if (date < a.start_date || date > a.end_date) return null;
  if (a.all_day) return [DAY_START, DAY_END];
  const s = date === a.start_date ? timeToMin(a.start_time) : DAY_START;
  const e = date === a.end_date ? timeToMin(a.end_time) : DAY_END;
  return e > s ? [s, e] : null;
}

/** 사람별로 막힌 칸(부재 사유) 배열 */
export function blockedMap(absences: Absence[], date: string): Record<string, (string | null)[]> {
  const out: Record<string, (string | null)[]> = {};
  for (const a of absences) {
    const r = absenceRangeOn(a, date);
    if (!r) continue;
    const row = (out[a.member_id] ??= Array(SLOT_COUNT).fill(null));
    const s0 = Math.max(0, Math.floor((r[0] - DAY_START) / 10));
    const s1 = Math.min(SLOT_COUNT, Math.ceil((r[1] - DAY_START) / 10));
    for (let s = s0; s < s1; s++) row[s] = a.reason;
  }
  return out;
}

// ---- 날짜 도우미 (YYYY-MM-DD, 시간대 영향 없음) ----
export function parseDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
export function fmtDate(dt: Date) {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
export function addDays(d: string, n: number) {
  const dt = parseDate(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fmtDate(dt);
}
export function diffDays(a: string, b: string) {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86400000);
}
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
export function weekdayKo(d: string) {
  return WEEK[parseDate(d).getUTCDay()];
}
export function isValidDate(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && fmtDate(parseDate(d)) === d;
}
/** 한국 시간 기준 오늘 */
export function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
export function prettyDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day} (${weekdayKo(d)})`;
}
