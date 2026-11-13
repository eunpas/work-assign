import { store } from '@/lib/db';
import { body, requireAdmin, route, type IdCtx } from '@/lib/server';
import { absenceInput } from '@/lib/validators';
import { saveAbsence } from '@/lib/absence-service';

export const PUT = route<IdCtx>(async (req, { params }) => {
  const { code, id } = await params;
  const b = await requireAdmin(code);
  const raw = await body(req);
  return { absence: await saveAbsence(b.id, absenceInput(raw), !!raw.merge, id) };
});

export const DELETE = route<IdCtx>(async (_req, { params }) => {
  const { code, id } = await params;
  const b = await requireAdmin(code);
  await store().deleteAbsences(b.id, [id]);
  return { ok: true };
});
