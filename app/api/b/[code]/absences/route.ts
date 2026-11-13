import { store } from '@/lib/db';
import { body, HttpError, requireAdmin, route, type CodeCtx } from '@/lib/server';
import { absenceInput } from '@/lib/validators';
import { saveAbsence } from '@/lib/absence-service';
import { addDays, isValidDate, todayKST } from '@/lib/time';

export const GET = route<CodeCtx>(async (req, { params }) => {
  const b = await requireAdmin((await params).code);
  const url = new URL(req.url);
  const from = url.searchParams.get('from') ?? addDays(todayKST(), -30);
  const to = url.searchParams.get('to') ?? addDays(todayKST(), 60);
  if (!isValidDate(from) || !isValidDate(to)) throw new HttpError(400, '날짜 형식이 올바르지 않아요');
  return { absences: await store().listAbsences(b.id, from, to) };
});

export const POST = route<CodeCtx>(async (req, { params }) => {
  const b = await requireAdmin((await params).code);
  const raw = await body(req);
  return { absence: await saveAbsence(b.id, absenceInput(raw), !!raw.merge) };
});
