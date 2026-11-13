import { store } from '@/lib/db';
import { buildPlanXlsx } from '@/lib/excel/plan';
import { gridFromCells } from '@/lib/plan-utils';
import { blockedFor, getBranch, HttpError, route, xlsxResponse, type CodeCtx } from '@/lib/server';
import { isValidDate, todayKST } from '@/lib/time';

/** 배정표 엑셀 내려받기 (F10) */
export const GET = route<CodeCtx>(async (req, { params }) => {
  const b = await getBranch((await params).code);
  const date = new URL(req.url).searchParams.get('date') ?? todayKST();
  if (!isValidDate(date)) throw new HttpError(400, '날짜 형식이 올바르지 않아요');
  const s = store();
  const saved = await s.getPlan(b.id, date);
  if (!saved) throw new HttpError(404, '이 날짜에 저장된 배정표가 없어요');
  const [all, { blocked }] = await Promise.all([s.listMembers(b.id), blockedFor(b.id, date)]);
  const inPlan = new Set(saved.cells.map((c) => c.member_id));
  const members = all.filter((m) => m.active || inPlan.has(m.id));
  const grid = gridFromCells(saved.cells, members.map((m) => m.id));
  const buf = await buildPlanXlsx({ branchName: b.name, date, members, routines: saved.routines, grid, blocked });
  return xlsxResponse(buf, `작업배정_${b.name}_${date}.xlsx`);
});
