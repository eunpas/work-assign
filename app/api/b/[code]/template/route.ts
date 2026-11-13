import { store } from '@/lib/db';
import { buildTemplate } from '@/lib/excel/template';
import { requireAdmin, route, xlsxResponse, type CodeCtx } from '@/lib/server';

/** 입력 양식 내려받기 (F20) — ?blank=1 이면 빈 양식 */
export const GET = route<CodeCtx>(async (req, { params }) => {
  const b = await requireAdmin((await params).code);
  const blank = new URL(req.url).searchParams.get('blank') === '1';
  const s = store();
  const [members, routines] = blank ? [[], []] : await Promise.all([s.listMembers(b.id), s.listRoutines(b.id)]);
  const buf = await buildTemplate(members, routines);
  return xlsxResponse(buf, blank ? '작업배정_입력양식.xlsx' : `작업배정_입력양식_${b.name}.xlsx`);
});
