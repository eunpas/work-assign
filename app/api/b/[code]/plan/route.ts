import { store } from '@/lib/db';
import { isAdminFor } from '@/lib/auth';
import { blockedFor, body, getBranch, HttpError, requireAdmin, route, type CodeCtx } from '@/lib/server';
import { isValidDate, SLOT_COUNT, todayKST } from '@/lib/time';
import type { Cell, PlanRoutine } from '@/lib/types';

/** 배정표 보기 (F9) — 링크만 있으면 누구나 */
export const GET = route<CodeCtx>(async (req, { params }) => {
  const b = await getBranch((await params).code);
  const date = new URL(req.url).searchParams.get('date') ?? todayKST();
  if (!isValidDate(date)) throw new HttpError(400, '날짜 형식이 올바르지 않아요');
  const s = store();
  const [allMembers, saved, { absences }] = await Promise.all([s.listMembers(b.id), s.getPlan(b.id, date), blockedFor(b.id, date)]);
  const inPlan = new Set(saved?.cells.map((c) => c.member_id));
  const members = allMembers
    .filter((m) => m.active || inPlan.has(m.id))
    .map(({ id, name, grade, role, sort_order, active }) => ({ id, name, grade, role, sort_order, active }));
  return {
    branch: { name: b.name, code: b.code },
    date,
    isAdmin: await isAdminFor(b),
    members,
    absences: absences.map(({ id, member_id, start_date, start_time, end_date, end_time, all_day, reason }) => ({
      id, member_id, start_date, start_time, end_date, end_time, all_day, reason, note: null, branch_id: '',
    })),
    plan: saved ? { updated_at: saved.plan.updated_at, routines: saved.routines, cells: saved.cells } : null,
  };
});

/** 배정표 저장 (F8) — 관리자만 */
export const PUT = route<CodeCtx>(async (req, { params }) => {
  const b = await requireAdmin((await params).code);
  const { date, routines, cells } = await body<{ date: string; routines: PlanRoutine[]; cells: Cell[] }>(req);
  if (!isValidDate(date)) throw new HttpError(400, '날짜 형식이 올바르지 않아요');
  if (!Array.isArray(routines) || !Array.isArray(cells)) throw new HttpError(400, '요청 형식이 올바르지 않아요');
  const s = store();
  const [members, all] = await Promise.all([s.listMembers(b.id), s.listRoutines(b.id)]);
  const mids = new Set(members.map((m) => m.id));
  const rmap = new Map(all.map((r) => [r.id, r]));
  const prs: PlanRoutine[] = routines.map((r) => {
    const base = rmap.get(r.routine_id);
    if (!base) throw new HttpError(400, '이 지사에 없는 작업이 있어요');
    return {
      routine_id: base.id,
      routine_no: base.routine_no,
      name: base.name,
      place: base.place,
      duration_min: base.duration_min,
      headcount: base.headcount,
      color: /^#[0-9A-Fa-f]{6}$/.test(r.color) ? r.color : '#E5E7EB',
      unassigned_reason: r.unassigned_reason ? String(r.unassigned_reason).slice(0, 200) : null,
    };
  });
  const rids = new Set(prs.map((r) => r.routine_id));
  const seen = new Set<string>();
  const clean: Cell[] = [];
  for (const c of cells) {
    if (!mids.has(c.member_id) || !rids.has(c.routine_id)) throw new HttpError(400, '배정 칸에 올바르지 않은 값이 있어요');
    if (!Number.isInteger(c.slot) || c.slot < 0 || c.slot >= SLOT_COUNT) throw new HttpError(400, '배정 칸 번호가 올바르지 않아요');
    const k = `${c.member_id}:${c.slot}`;
    if (seen.has(k)) continue;
    seen.add(k);
    clean.push({ member_id: c.member_id, slot: c.slot, routine_id: c.routine_id });
  }
  const plan = await s.savePlan(b.id, date, prs, clean);
  return { updated_at: plan.updated_at };
});
