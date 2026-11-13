import { SLOT_COUNT, slotToTime } from './time';
import type { Cell } from './types';

export type Grid = Record<string, (string | null)[]>;

export function gridFromCells(cells: Cell[], memberIds: string[]): Grid {
  const g: Grid = {};
  for (const id of memberIds) g[id] = Array(SLOT_COUNT).fill(null);
  for (const c of cells) {
    (g[c.member_id] ??= Array(SLOT_COUNT).fill(null))[c.slot] = c.routine_id;
  }
  return g;
}

export function cellsFromGrid(g: Grid): Cell[] {
  const out: Cell[] = [];
  for (const [member_id, row] of Object.entries(g)) row.forEach((rid, slot) => rid && out.push({ member_id, slot, routine_id: rid }));
  return out;
}

export interface RoutineSpan {
  start: number;
  end: number;
  members: string[];
}

/** 작업별 실제 배정 시각과 인원 */
export function routineSpans(g: Grid): Record<string, RoutineSpan> {
  const out: Record<string, RoutineSpan> = {};
  for (const [mid, row] of Object.entries(g)) {
    row.forEach((rid, s) => {
      if (!rid) return;
      const sp = (out[rid] ??= { start: s, end: s + 1, members: [] });
      sp.start = Math.min(sp.start, s);
      sp.end = Math.max(sp.end, s + 1);
      if (!sp.members.includes(mid)) sp.members.push(mid);
    });
  }
  return out;
}

export const spanLabel = (sp?: RoutineSpan) => (sp ? `${slotToTime(sp.start)}–${slotToTime(sp.end)}` : '—');
