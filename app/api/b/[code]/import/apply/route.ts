import { store } from '@/lib/db';
import { diffImport, type ImportPayload } from '@/lib/importer';
import { body, HttpError, requireAdmin, route, type CodeCtx } from '@/lib/server';
import { memberInput, routineInput } from '@/lib/validators';

/** 미리보기 확인 후 [반영] — 전부 성공 또는 전부 취소 */
export const POST = route<CodeCtx>(async (req, { params }) => {
  const b = await requireAdmin((await params).code);
  const { payload } = await body<{ payload: ImportPayload }>(req);
  if (!payload || !Array.isArray(payload.members) || !Array.isArray(payload.routines)) throw new HttpError(400, '반영할 내용이 없어요');
  // 서버에서 한 번 더 검사
  const clean: ImportPayload = {
    members: payload.members.map((m) => {
      const v = memberInput({ ...m, sort_order: m.sort_order ?? 999 });
      return { name: v.name!, grade: v.grade!, role: v.role!, sort_order: m.sort_order === null ? null : v.sort_order!, active: v.active! };
    }),
    routines: payload.routines.map((r) => {
      const v = routineInput(r as unknown as Record<string, unknown>);
      return { routine_no: v.routine_no!, name: v.name!, place: v.place!, duration_min: v.duration_min!, headcount: v.headcount!, cycle: v.cycle!, anchor_date: v.anchor_date ?? null, active: v.active! };
    }),
  };
  if (new Set(clean.members.map((m) => m.name)).size !== clean.members.length) throw new HttpError(400, '이름이 중복돼요');
  if (new Set(clean.routines.map((r) => r.routine_no)).size !== clean.routines.length) throw new HttpError(400, '루틴번호가 중복돼요');
  const s = store();
  const [members, routines] = await Promise.all([s.listMembers(b.id), s.listRoutines(b.id)]);
  const preview = diffImport(clean, { members, routines });
  await s.applyImport(b.id, preview.ops);
  return { counts: preview.counts };
});
