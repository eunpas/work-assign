/** 양식 → DB 변경 계산 (6.1-1 반영 규칙) */
import type { ParsedMember, ParsedRoutine, SheetError } from './excel/parse';
import type { ImportOps } from './db/types';
import { CYCLE_LABEL, GRADE_LABEL, fmtNo, type Member, type Routine } from './types';

export interface ImportPayload {
  members: Omit<ParsedMember, 'row'>[];
  routines: Omit<ParsedRoutine, 'row'>[];
}

export interface PreviewItem {
  kind: 'add' | 'update' | 'deactivate';
  sheet: '인원' | '작업루틴';
  label: string;
  detail?: string;
}

export interface ImportPreview {
  counts: { add: number; update: number; deactivate: number; error: number };
  items: PreviewItem[];
  errors: SheetError[];
  payload: ImportPayload;
  ops: ImportOps;
}

export function diffImport(payload: ImportPayload, current: { members: Member[]; routines: Routine[] }, errors: SheetError[] = []): ImportPreview {
  const ops: ImportOps = { memberInserts: [], memberUpdates: [], routineInserts: [], routineUpdates: [] };
  const items: PreviewItem[] = [];
  const maxOrder = Math.max(0, ...current.members.map((m) => m.sort_order).filter((n) => n < 999));
  let nextOrder = maxOrder;

  const mByName = new Map(current.members.map((m) => [m.name, m]));
  for (const p of payload.members) {
    const ex = mByName.get(p.name);
    if (!ex) {
      ops.memberInserts.push({ name: p.name, grade: p.grade, role: p.role, sort_order: p.sort_order ?? ++nextOrder, active: p.active });
      items.push({ kind: 'add', sheet: '인원', label: p.name, detail: `${GRADE_LABEL[p.grade]}${p.active ? '' : ' · 사용중지'}` });
      continue;
    }
    const patch: Partial<Member> = {};
    const changes: string[] = [];
    if (ex.grade !== p.grade) (patch.grade = p.grade), changes.push(`등급 ${GRADE_LABEL[ex.grade]}→${GRADE_LABEL[p.grade]}`);
    if (ex.role !== p.role) (patch.role = p.role), changes.push('역할');
    if (p.sort_order !== null && ex.sort_order !== p.sort_order) (patch.sort_order = p.sort_order), changes.push('표시순서');
    const deactivate = ex.active && !p.active;
    if (ex.active !== p.active) patch.active = p.active;
    if (!ex.active && p.active) changes.push('다시 사용');
    if (Object.keys(patch).length) ops.memberUpdates.push({ id: ex.id, ...patch });
    if (deactivate) items.push({ kind: 'deactivate', sheet: '인원', label: p.name });
    else if (changes.length) items.push({ kind: 'update', sheet: '인원', label: p.name, detail: changes.join(', ') });
  }

  const rByNo = new Map(current.routines.map((r) => [r.routine_no, r]));
  for (const p of payload.routines) {
    const ex = rByNo.get(p.routine_no);
    const label = `${fmtNo(p.routine_no)} ${p.name}`;
    if (!ex) {
      ops.routineInserts.push({ ...p });
      items.push({ kind: 'add', sheet: '작업루틴', label, detail: `${p.place} · ${p.duration_min}분 · ${p.headcount}명 · ${CYCLE_LABEL[p.cycle]}` });
      continue;
    }
    const patch: Partial<Routine> = {};
    const changes: string[] = [];
    if (ex.name !== p.name) (patch.name = p.name), changes.push('작업명');
    if (ex.place !== p.place) (patch.place = p.place), changes.push(`장소 ${ex.place}→${p.place}`);
    if (ex.duration_min !== p.duration_min) (patch.duration_min = p.duration_min), changes.push(`시간 ${ex.duration_min}→${p.duration_min}분`);
    if (ex.headcount !== p.headcount) (patch.headcount = p.headcount), changes.push(`인원 ${ex.headcount}→${p.headcount}명`);
    if (ex.cycle !== p.cycle) (patch.cycle = p.cycle), changes.push(`주기 ${CYCLE_LABEL[ex.cycle]}→${CYCLE_LABEL[p.cycle]}`);
    if ((ex.anchor_date ?? null) !== (p.anchor_date ?? null)) (patch.anchor_date = p.anchor_date), changes.push('기준일');
    const deactivate = ex.active && !p.active;
    if (ex.active !== p.active) patch.active = p.active;
    if (!ex.active && p.active) changes.push('다시 사용');
    if (Object.keys(patch).length) ops.routineUpdates.push({ id: ex.id, ...patch });
    if (deactivate) items.push({ kind: 'deactivate', sheet: '작업루틴', label });
    else if (changes.length) items.push({ kind: 'update', sheet: '작업루틴', label, detail: changes.join(', ') });
  }

  const count = (k: PreviewItem['kind']) => items.filter((i) => i.kind === k).length;
  return {
    counts: { add: count('add'), update: count('update'), deactivate: count('deactivate'), error: errors.length },
    items,
    errors,
    payload,
    ops,
  };
}
