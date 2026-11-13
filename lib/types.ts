export type Grade = 'special' | 'advanced' | 'intermediate' | 'junior' | 'assistant';
export type Role = 'leader' | 'sub_leader' | 'member';
export type Place = 'A' | 'B' | 'C';
export type Cycle = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type Reason = '휴가' | '출장' | '교육' | '기타';

export const GRADES: Grade[] = ['special', 'advanced', 'intermediate', 'junior', 'assistant'];
export const GRADE_LABEL: Record<Grade, string> = {
  special: '특급기술자',
  advanced: '고급기술자',
  intermediate: '중급기술자',
  junior: '초급기술자',
  assistant: '작업보조',
};
export const GRADE_SHORT: Record<Grade, string> = {
  special: '특급',
  advanced: '고급',
  intermediate: '중급',
  junior: '초급',
  assistant: '보조',
};
export const ROLES: Role[] = ['leader', 'sub_leader', 'member'];
export const ROLE_LABEL: Record<Role, string> = { leader: '팀장', sub_leader: '부팀장', member: '팀원' };
export const PLACES: Place[] = ['A', 'B', 'C'];
export const CYCLES: Cycle[] = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual'];
export const CYCLE_LABEL: Record<Cycle, string> = {
  daily: '일일',
  weekly: '주간',
  biweekly: '격주',
  monthly: '월간',
  quarterly: '분기',
  semiannual: '반기',
  annual: '연간',
};
export const REASONS: Reason[] = ['휴가', '출장', '교육', '기타'];
export const DURATIONS = [10, 20, 30, 40, 50, 60];
export const HEADCOUNTS = [1, 2, 3];

export const isTech = (g: Grade | undefined | null) => !!g && g !== 'assistant';
export const fmtNo = (n: number) => String(n).padStart(3, '0');

export interface Branch {
  id: string;
  name: string;
  code: string;
  admin_password_hash: string;
  google_sheet_url: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  branch_id: string;
  name: string;
  grade: Grade;
  role: Role;
  sort_order: number;
  active: boolean;
}

export interface Routine {
  id: string;
  branch_id: string;
  routine_no: number;
  name: string;
  place: Place;
  duration_min: number;
  headcount: number;
  cycle: Cycle;
  anchor_date: string | null;
  active: boolean;
}

export interface Absence {
  id: string;
  branch_id: string;
  member_id: string;
  start_date: string;
  start_time: string; // HH:MM
  end_date: string;
  end_time: string; // HH:MM
  all_day: boolean;
  reason: Reason;
  note: string | null;
}

export interface Plan {
  id: string;
  branch_id: string;
  date: string;
  updated_at: string;
}

export interface PlanRoutine {
  routine_id: string;
  routine_no: number;
  name: string;
  place: Place;
  duration_min: number;
  headcount: number;
  color: string;
  unassigned_reason: string | null;
}

export interface Cell {
  member_id: string;
  slot: number;
  routine_id: string;
}

export interface SavedPlan {
  plan: Plan;
  routines: PlanRoutine[];
  cells: Cell[];
}

export type MemberInput = Omit<Member, 'id' | 'branch_id'>;
export type RoutineInput = Omit<Routine, 'id' | 'branch_id'>;
export type AbsenceInput = Omit<Absence, 'id' | 'branch_id'>;
