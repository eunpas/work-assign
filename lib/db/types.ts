import type { Absence, AbsenceInput, Branch, Cell, Member, MemberInput, Plan, PlanRoutine, Routine, RoutineInput, SavedPlan } from '../types';

export interface ImportOps {
  memberInserts: MemberInput[];
  memberUpdates: ({ id: string } & Partial<MemberInput>)[];
  routineInserts: RoutineInput[];
  routineUpdates: ({ id: string } & Partial<RoutineInput>)[];
}

/** 모든 함수는 branch_id로 지사를 분리한다 (F12) */
export interface Store {
  kind: 'supabase' | 'local';
  getBranchByCode(code: string): Promise<Branch | null>;
  createBranch(b: { name: string; code: string; admin_password_hash: string }): Promise<Branch>;
  updateBranch(id: string, patch: Partial<Pick<Branch, 'name' | 'google_sheet_url' | 'admin_password_hash'>>): Promise<void>;

  listMembers(branchId: string): Promise<Member[]>;
  createMember(branchId: string, m: MemberInput): Promise<Member>;
  updateMember(branchId: string, id: string, patch: Partial<MemberInput>): Promise<Member>;

  listRoutines(branchId: string): Promise<Routine[]>;
  createRoutine(branchId: string, r: RoutineInput): Promise<Routine>;
  updateRoutine(branchId: string, id: string, patch: Partial<RoutineInput>): Promise<Routine>;

  /** from~to 날짜와 겹치는 부재 */
  listAbsences(branchId: string, from: string, to: string): Promise<Absence[]>;
  createAbsence(branchId: string, a: AbsenceInput): Promise<Absence>;
  updateAbsence(branchId: string, id: string, patch: Partial<AbsenceInput>): Promise<Absence>;
  deleteAbsences(branchId: string, ids: string[]): Promise<void>;

  getPlan(branchId: string, date: string): Promise<SavedPlan | null>;
  savePlan(branchId: string, date: string, routines: PlanRoutine[], cells: Cell[]): Promise<Plan>;

  /** 한 번에 전부 성공하거나 전부 취소 (트랜잭션) */
  applyImport(branchId: string, ops: ImportOps): Promise<void>;
}
