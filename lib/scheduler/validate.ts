/** 규칙 위반 검사 (5.4, F13) — 손으로 고친 뒤 표 전체를 다시 검사 */
import { breakOf, slotToTime, SLOT_COUNT } from '../time';
import { fmtNo, isTech, type Grade } from '../types';

export type WarningKind = 'tech' | 'split' | 'timing' | 'headcount' | 'travel' | 'absence' | 'break';

export interface PlanWarning {
  kind: WarningKind;
  message: string;
  /** `${memberId}:${slot}` */
  cells: string[];
  routine_id?: string;
}

export interface ValidateInput {
  members: { id: string; name: string; grade: Grade }[];
  routines: { routine_id: string; routine_no: number; name: string; place: string; duration_min: number; headcount: number }[];
  grid: Record<string, (string | null)[]>;
  blocked: Record<string, (string | null)[]>;
}

export const WARNING_LABEL: Record<WarningKind, string> = {
  tech: '기술자 없음',
  split: '작업 끊김',
  timing: '시간 불일치',
  headcount: '인원 불일치',
  travel: '이동시간 부족',
  absence: '부재 중 배정',
  break: '휴게시간 배정',
};

const key = (m: string, s: number) => `${m}:${s}`;

export function validatePlan({ members, routines, grid, blocked }: ValidateInput): PlanWarning[] {
  const rmap = new Map(routines.map((r) => [r.routine_id, r]));
  const out: PlanWarning[] = [];
  const byRoutine = new Map<string, Map<string, number[]>>();

  for (const m of members) {
    const row = grid[m.id];
    if (!row) continue;
    const absenceCells = new Map<string, string[]>();
    const breakCells = new Map<string, string[]>();
    for (let s = 0; s < SLOT_COUNT; s++) {
      const rid = row[s];
      if (!rid || !rmap.has(rid)) continue;
      const per = byRoutine.get(rid) ?? new Map<string, number[]>();
      byRoutine.set(rid, per);
      (per.get(m.id) ?? per.set(m.id, []).get(m.id)!).push(s);
      if (breakOf(s)) (breakCells.get(rid) ?? breakCells.set(rid, []).get(rid)!).push(key(m.id, s));
      if (blocked[m.id]?.[s]) (absenceCells.get(rid) ?? absenceCells.set(rid, []).get(rid)!).push(key(m.id, s));
    }
    for (const [rid, cells] of absenceCells) {
      const r = rmap.get(rid)!;
      out.push({ kind: 'absence', routine_id: rid, cells, message: `${m.name} — 부재 시간에 ${fmtNo(r.routine_no)} ${r.name} 작업이 들어가 있어요` });
    }
    for (const [rid, cells] of breakCells) {
      const r = rmap.get(rid)!;
      out.push({ kind: 'break', routine_id: rid, cells, message: `${m.name} — 점심·체육 시간에 ${fmtNo(r.routine_no)} 작업이 있어요` });
    }
    // R6 이동시간
    for (let s = 1; s < SLOT_COUNT; s++) {
      const a = row[s - 1];
      const b = row[s];
      if (!a || !b || a === b) continue;
      const pa = rmap.get(a)?.place;
      const pb = rmap.get(b)?.place;
      if (pa && pb && pa !== pb)
        out.push({ kind: 'travel', cells: [key(m.id, s - 1), key(m.id, s)], message: `${m.name} ${slotToTime(s)} — 장소가 ${pa}→${pb}로 바뀌는데 이동시간 10분이 없어요` });
    }
  }

  const mmap = new Map(members.map((m) => [m.id, m]));
  for (const [rid, per] of byRoutine) {
    const r = rmap.get(rid)!;
    const label = `${fmtNo(r.routine_no)} ${r.name}`;
    const all: string[] = [];
    const ranges: [number, number, number][] = [];
    for (const [mid, slots] of per) {
      slots.sort((a, b) => a - b);
      slots.forEach((s) => all.push(key(mid, s)));
      const contiguous = slots.every((s, i) => i === 0 || s === slots[i - 1] + 1);
      if (!contiguous)
        out.push({ kind: 'split', routine_id: rid, cells: slots.map((s) => key(mid, s)), message: `${label} — ${mmap.get(mid)?.name}의 작업이 끊겼거나 두 번 나와요` });
      ranges.push([slots[0], slots[slots.length - 1] + 1, slots.length]);
    }
    const d = r.duration_min / 10;
    if (new Set(ranges.map((x) => x[0])).size > 1 || new Set(ranges.map((x) => x[1])).size > 1)
      out.push({ kind: 'timing', routine_id: rid, cells: all, message: `${label} — 참여 인원의 시작·종료 시각이 달라요` });
    if (ranges.some((x) => x[2] !== d))
      out.push({ kind: 'timing', routine_id: rid, cells: all, message: `${label} — 작업 시간이 정해진 ${r.duration_min}분과 달라요` });
    if (per.size !== r.headcount)
      out.push({ kind: 'headcount', routine_id: rid, cells: all, message: `${label} — 인원이 ${per.size < r.headcount ? '부족' : '초과'}해요 (${per.size}/${r.headcount}명)` });
    if (![...per.keys()].some((mid) => isTech(mmap.get(mid)?.grade)))
      out.push({ kind: 'tech', routine_id: rid, cells: all, message: `${label} — 기술자가 한 명도 없어요` });
  }
  return out;
}
