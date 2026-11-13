import { store } from '@/lib/db';
import { body, requireAdmin, route, type CodeCtx } from '@/lib/server';
import { memberInput } from '@/lib/validators';
import type { MemberInput } from '@/lib/types';

export const GET = route<CodeCtx>(async (_req, { params }) => {
  const b = await requireAdmin((await params).code);
  return { members: await store().listMembers(b.id) };
});

export const POST = route<CodeCtx>(async (req, { params }) => {
  const b = await requireAdmin((await params).code);
  const input = memberInput(await body(req)) as MemberInput;
  return { member: await store().createMember(b.id, input) };
});
