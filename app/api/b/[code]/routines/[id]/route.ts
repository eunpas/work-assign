import { store } from '@/lib/db';
import { body, requireAdmin, route, type IdCtx } from '@/lib/server';
import { routineInput } from '@/lib/validators';

export const PATCH = route<IdCtx>(async (req, { params }) => {
  const { code, id } = await params;
  const b = await requireAdmin(code);
  return { routine: await store().updateRoutine(b.id, id, routineInput(await body(req), true)) };
});
