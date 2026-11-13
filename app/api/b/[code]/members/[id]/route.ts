import { store } from '@/lib/db';
import { body, requireAdmin, route, type IdCtx } from '@/lib/server';
import { memberInput } from '@/lib/validators';

export const PATCH = route<IdCtx>(async (req, { params }) => {
  const { code, id } = await params;
  const b = await requireAdmin(code);
  return { member: await store().updateMember(b.id, id, memberInput(await body(req), true)) };
});
