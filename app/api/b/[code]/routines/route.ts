import { store } from '@/lib/db';
import { body, requireAdmin, route, type CodeCtx } from '@/lib/server';
import { routineInput } from '@/lib/validators';
import type { RoutineInput } from '@/lib/types';

export const GET = route<CodeCtx>(async (_req, { params }) => {
  const b = await requireAdmin((await params).code);
  return { routines: await store().listRoutines(b.id) };
});

export const POST = route<CodeCtx>(async (req, { params }) => {
  const b = await requireAdmin((await params).code);
  const input = routineInput(await body(req)) as RoutineInput;
  return { routine: await store().createRoutine(b.id, input) };
});
