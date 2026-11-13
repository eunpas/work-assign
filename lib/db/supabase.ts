/** Supabase 저장소 — 서버 전용 (service_role 키는 브라우저에 절대 노출되지 않음) */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Absence, Branch, Cell, Member, PlanRoutine, Routine } from '../types';
import type { Store } from './types';

let client: SupabaseClient | null = null;
function sb() {
  if (!client)
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  return client;
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === '23505') throw new Error('DUPLICATE');
    throw new Error(res.error.message);
  }
  return res.data;
}

const hhmm = (t: string) => (t ? t.slice(0, 5) : t);
const normAbs = (a: Absence): Absence => ({ ...a, start_time: hhmm(a.start_time), end_time: hhmm(a.end_time) });

export const supabaseStore: Store = {
  kind: 'supabase',
  async getBranchByCode(code) {
    return check(await sb().from('branches').select('*').eq('code', code).maybeSingle()) as Branch | null;
  },
  async createBranch(b) {
    return check(await sb().from('branches').insert(b).select('*').single()) as Branch;
  },
  async updateBranch(id, patch) {
    check(await sb().from('branches').update(patch).eq('id', id));
  },

  async listMembers(branchId) {
    return check(await sb().from('members').select('*').eq('branch_id', branchId).order('sort_order').order('name')) as Member[];
  },
  async createMember(branchId, m) {
    return check(await sb().from('members').insert({ ...m, branch_id: branchId }).select('*').single()) as Member;
  },
  async updateMember(branchId, id, patch) {
    return check(await sb().from('members').update(patch).eq('id', id).eq('branch_id', branchId).select('*').single()) as Member;
  },

  async listRoutines(branchId) {
    return check(await sb().from('routines').select('*').eq('branch_id', branchId).order('routine_no')) as Routine[];
  },
  async createRoutine(branchId, r) {
    return check(await sb().from('routines').insert({ ...r, branch_id: branchId }).select('*').single()) as Routine;
  },
  async updateRoutine(branchId, id, patch) {
    return check(await sb().from('routines').update(patch).eq('id', id).eq('branch_id', branchId).select('*').single()) as Routine;
  },

  async listAbsences(branchId, from, to) {
    const rows = check(
      await sb().from('absences').select('*').eq('branch_id', branchId).lte('start_date', to).gte('end_date', from).order('start_date').order('start_time'),
    ) as Absence[];
    return rows.map(normAbs);
  },
  async createAbsence(branchId, a) {
    return normAbs(check(await sb().from('absences').insert({ ...a, branch_id: branchId }).select('*').single()) as Absence);
  },
  async updateAbsence(branchId, id, patch) {
    return normAbs(check(await sb().from('absences').update(patch).eq('id', id).eq('branch_id', branchId).select('*').single()) as Absence);
  },
  async deleteAbsences(branchId, ids) {
    if (ids.length) check(await sb().from('absences').delete().eq('branch_id', branchId).in('id', ids));
  },

  async getPlan(branchId, date) {
    const plan = check(await sb().from('plans').select('*').eq('branch_id', branchId).eq('date', date).maybeSingle());
    if (!plan) return null;
    const [routines, cells] = await Promise.all([
      sb().from('plan_routines').select('routine_id,routine_no,name,place,duration_min,headcount,color,unassigned_reason').eq('plan_id', plan.id),
      sb().from('assignment_cells').select('member_id,slot,routine_id').eq('plan_id', plan.id),
    ]);
    return { plan, routines: (check(routines) ?? []) as PlanRoutine[], cells: (check(cells) ?? []) as Cell[] };
  },
  async savePlan(branchId, date, routines, cells) {
    const res = check(await sb().rpc('save_plan', { p_branch: branchId, p_date: date, p_routines: routines, p_cells: cells })) as { id: string; updated_at: string };
    return { id: res.id, branch_id: branchId, date, updated_at: res.updated_at };
  },

  async applyImport(branchId, ops) {
    check(
      await sb().rpc('apply_import', {
        p_branch: branchId,
        p_member_inserts: ops.memberInserts,
        p_member_updates: ops.memberUpdates,
        p_routine_inserts: ops.routineInserts,
        p_routine_updates: ops.routineUpdates,
      }),
    );
  },
};
