import { describe, expect, it } from 'vitest';
import { autoAssign, type SchedMember } from '../lib/scheduler/assign';
import { validatePlan } from '../lib/scheduler/validate';
import { suwonMembers, suwonRoutines } from '../lib/seed-data';
import { isDue } from '../lib/cycle';
import { blockedMap, SLOT_COUNT, breakOf } from '../lib/time';
import { gridFromCells } from '../lib/plan-utils';
import { isTech, type Absence, type Reason } from '../lib/types';

const DATE = '2026-11-13';
const members = suwonMembers().map((m, i) => ({ ...m, id: `m${i}` }));
const routines = suwonRoutines().map((r, i) => ({ ...r, id: `r${i}` }));
const today = routines.filter((r) => isDue(r.cycle, r.anchor_date, DATE));

function absence(memberIdx: number, start: string, end: string, reason: Reason = '휴가', allDay = false): Absence {
  return { id: `a${memberIdx}${start}`, branch_id: 'b', member_id: `m${memberIdx}`, start_date: DATE, end_date: DATE, start_time: start, end_time: end, all_day: allDay, reason, note: null };
}

function run(absences: Absence[], seed = 1) {
  const blocked = blockedMap(absences, DATE);
  const sm: SchedMember[] = members.map((m) => ({ id: m.id, tech: isTech(m.grade), blocked: Array.from({ length: SLOT_COUNT }, (_, s) => !!blocked[m.id]?.[s]) }));
  const res = autoAssign(
    sm,
    today.map((r) => ({ id: r.id, place: r.place, duration_min: r.duration_min, headcount: r.headcount })),
    { timeLimitMs: 2500, seed },
  );
  const grid = gridFromCells(res.cells, members.map((m) => m.id));
  const warnings = validatePlan({
    members,
    routines: today.map((r) => ({ ...r, routine_id: r.id })),
    grid,
    blocked,
  });
  return { res, grid, warnings, blocked };
}

describe('가상 데이터', () => {
  it('18명 · 100개 · 일일 3,670분 · 2026-11-13은 66개 5,220분', () => {
    expect(members).toHaveLength(18);
    expect(routines).toHaveLength(100);
    const daily = routines.filter((r) => r.cycle === 'daily');
    expect(daily).toHaveLength(50);
    expect(daily.reduce((a, r) => a + r.duration_min * r.headcount, 0)).toBe(3670);
    expect(today).toHaveLength(66);
    expect(today.reduce((a, r) => a + r.duration_min * r.headcount, 0)).toBe(5220);
  });
});

describe('자동 배정', () => {
  it('3명 종일 부재: 미배정 0건, 규칙 R1~R7 모두 준수, 3초 이내', () => {
    const { res, warnings } = run([absence(3, '08:00', '17:00', '휴가', true), absence(9, '08:00', '17:00', '출장', true), absence(15, '08:00', '17:00', '교육', true)]);
    expect(res.ms).toBeLessThan(3000);
    expect(warnings).toEqual([]);
    expect(res.unassigned).toEqual([]);
    console.log(`3명 부재 → 미배정 ${res.unassigned.length}, 이동 ${res.moves}회, 반복 ${res.iterations}회, ${res.ms}ms`);
  });

  it('5명 종일 부재(용량 96%): 배정된 것은 모두 규칙 준수', () => {
    const { res, warnings } = run([3, 6, 9, 12, 15].map((i) => absence(i, '08:00', '17:00', '휴가', true)));
    expect(warnings).toEqual([]);
    console.log(`5명 부재 → 미배정 ${res.unassigned.length}, 이동 ${res.moves}회`);
  });

  it('7명 종일 부재(용량 초과): 미배정 목록과 사유가 나오고, 배정된 것은 규칙 준수', () => {
    const { res, warnings } = run([1, 3, 6, 9, 12, 15, 16].map((i) => absence(i, '08:00', '17:00', '휴가', true)));
    expect(warnings).toEqual([]);
    expect(res.unassigned.length).toBeGreaterThan(0);
    for (const u of res.unassigned) expect(u.reason.length).toBeGreaterThan(0);
    console.log(`7명 부재 → 미배정 ${res.unassigned.length}, 이동 ${res.moves}회`);
  });

  it('일부 부재(09:00–10:30 교육)는 그 시간만 비우고 나머지에 배정', () => {
    const { grid, warnings, blocked } = run([absence(5, '09:00', '10:30', '교육'), absence(0, '13:00', '16:00', '출장')]);
    expect(warnings).toEqual([]);
    const row = grid['m5'];
    for (let s = 6; s < 15; s++) expect(row[s]).toBeNull();
    expect(row.some((v, s) => v && (s < 6 || s >= 15))).toBe(true);
    expect(blocked['m5'].filter(Boolean)).toHaveLength(9);
  });

  it('점심·체육 칸에는 배정하지 않음', () => {
    const { grid } = run([]);
    for (const row of Object.values(grid)) row.forEach((v, s) => breakOf(s) && expect(v).toBeNull());
  });
});

describe('규칙 검사(F13)', () => {
  it('기술자 없음·인원 불일치·이동시간 부족을 잡아냄', () => {
    const r1 = { routine_id: 'x', routine_no: 1, name: 't', place: 'A', duration_min: 20, headcount: 2 };
    const r2 = { routine_id: 'y', routine_no: 2, name: 'u', place: 'B', duration_min: 10, headcount: 1 };
    const ms = [
      { id: 'p', name: '보조1', grade: 'assistant' as const },
      { id: 'q', name: '보조2', grade: 'assistant' as const },
    ];
    const grid = { p: Array(SLOT_COUNT).fill(null), q: Array(SLOT_COUNT).fill(null) };
    grid.p[0] = grid.p[1] = 'x';
    grid.q[0] = grid.q[1] = 'x';
    grid.q[2] = 'y';
    const kinds = validatePlan({ members: ms, routines: [r1, r2], grid, blocked: {} }).map((w) => w.kind).sort();
    expect(kinds).toEqual(['tech', 'tech', 'travel']);
  });
});

describe('주기 계산(F14)', () => {
  it('월간 31일 기준 → 말일', () => {
    expect(isDue('monthly', '2026-01-31', '2026-02-28')).toBe(true);
    expect(isDue('monthly', '2026-01-31', '2026-02-27')).toBe(false);
    expect(isDue('weekly', '2026-11-06', '2026-11-13')).toBe(true);
    expect(isDue('biweekly', '2026-11-06', '2026-11-13')).toBe(false);
    expect(isDue('quarterly', '2026-08-13', '2026-11-13')).toBe(true);
    expect(isDue('annual', '2025-11-13', '2026-11-13')).toBe(true);
  });
});
