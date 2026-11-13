/**
 * 로컬 파일 저장소 — Supabase 환경변수가 없을 때(개발·시연) 사용.
 * Vercel 같은 서버리스 환경에서는 파일이 유지되지 않으니 반드시 Supabase를 쓰세요.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { buildSeed } from '../seed-data';
import type { Absence, Branch, Cell, Member, Plan, PlanRoutine, Routine } from '../types';
import type { Store } from './types';

interface DB {
  branches: Branch[];
  members: Member[];
  routines: Routine[];
  absences: Absence[];
  plans: Plan[];
  plan_routines: (PlanRoutine & { plan_id: string })[];
  cells: (Cell & { plan_id: string })[];
}

// Vercel에서는 /tmp만 쓸 수 있음 (서버가 바뀌면 초기화되는 임시 시연용)
const FILE =
  process.env.LOCAL_DB_PATH || (process.env.VERCEL ? path.join('/tmp', 'work-assign-db.json') : path.join(process.cwd(), '.data', 'db.json'));

function load(): DB {
  if (!fs.existsSync(FILE)) {
    const seed = buildSeed((pw) => bcrypt.hashSync(pw, 10), () => crypto.randomUUID());
    const db: DB = { ...seed, plans: [], plan_routines: [], cells: [] };
    save(db);
    return db;
  }
  return JSON.parse(fs.readFileSync(FILE, 'utf8')) as DB;
}

function save(db: DB) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, FILE);
}

function mutate<T>(fn: (db: DB) => T): T {
  const db = load();
  const out = fn(db);
  save(db);
  return out;
}

const uuid = () => crypto.randomUUID();
const notFound = () => new Error('NOT_FOUND');

export const localStore: Store = {
  kind: 'local',
  async getBranchByCode(code) {
    return load().branches.find((b) => b.code === code) ?? null;
  },
  async createBranch(b) {
    return mutate((db) => {
      const row: Branch = { ...b, id: uuid(), google_sheet_url: null, created_at: new Date().toISOString() };
      db.branches.push(row);
      return row;
    });
  },
  async updateBranch(id, patch) {
    mutate((db) => {
      const b = db.branches.find((x) => x.id === id);
      if (b) Object.assign(b, patch);
    });
  },

  async listMembers(branchId) {
    return load()
      .members.filter((m) => m.branch_id === branchId)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  },
  async createMember(branchId, m) {
    return mutate((db) => {
      if (db.members.some((x) => x.branch_id === branchId && x.name === m.name)) throw new Error('DUPLICATE');
      const row: Member = { ...m, id: uuid(), branch_id: branchId };
      db.members.push(row);
      return row;
    });
  },
  async updateMember(branchId, id, patch) {
    return mutate((db) => {
      const m = db.members.find((x) => x.id === id && x.branch_id === branchId);
      if (!m) throw notFound();
      if (patch.name && db.members.some((x) => x.branch_id === branchId && x.name === patch.name && x.id !== id)) throw new Error('DUPLICATE');
      Object.assign(m, patch);
      return m;
    });
  },

  async listRoutines(branchId) {
    return load()
      .routines.filter((r) => r.branch_id === branchId)
      .sort((a, b) => a.routine_no - b.routine_no);
  },
  async createRoutine(branchId, r) {
    return mutate((db) => {
      if (db.routines.some((x) => x.branch_id === branchId && x.routine_no === r.routine_no)) throw new Error('DUPLICATE');
      const row: Routine = { ...r, id: uuid(), branch_id: branchId };
      db.routines.push(row);
      return row;
    });
  },
  async updateRoutine(branchId, id, patch) {
    return mutate((db) => {
      const r = db.routines.find((x) => x.id === id && x.branch_id === branchId);
      if (!r) throw notFound();
      if (patch.routine_no && db.routines.some((x) => x.branch_id === branchId && x.routine_no === patch.routine_no && x.id !== id)) throw new Error('DUPLICATE');
      Object.assign(r, patch);
      return r;
    });
  },

  async listAbsences(branchId, from, to) {
    return load()
      .absences.filter((a) => a.branch_id === branchId && a.start_date <= to && a.end_date >= from)
      .sort((a, b) => (a.start_date + a.start_time).localeCompare(b.start_date + b.start_time));
  },
  async createAbsence(branchId, a) {
    return mutate((db) => {
      const row: Absence = { ...a, id: uuid(), branch_id: branchId };
      db.absences.push(row);
      return row;
    });
  },
  async updateAbsence(branchId, id, patch) {
    return mutate((db) => {
      const a = db.absences.find((x) => x.id === id && x.branch_id === branchId);
      if (!a) throw notFound();
      Object.assign(a, patch);
      return a;
    });
  },
  async deleteAbsences(branchId, ids) {
    mutate((db) => {
      db.absences = db.absences.filter((a) => !(a.branch_id === branchId && ids.includes(a.id)));
    });
  },

  async getPlan(branchId, date) {
    const db = load();
    const plan = db.plans.find((p) => p.branch_id === branchId && p.date === date);
    if (!plan) return null;
    return {
      plan,
      routines: db.plan_routines.filter((r) => r.plan_id === plan.id).map(({ plan_id: _p, ...r }) => r),
      cells: db.cells.filter((c) => c.plan_id === plan.id).map(({ plan_id: _p, ...c }) => c),
    };
  },
  async savePlan(branchId, date, routines, cells) {
    return mutate((db) => {
      let plan = db.plans.find((p) => p.branch_id === branchId && p.date === date);
      if (!plan) {
        plan = { id: uuid(), branch_id: branchId, date, updated_at: '' };
        db.plans.push(plan);
      }
      plan.updated_at = new Date().toISOString();
      const pid = plan.id;
      db.plan_routines = db.plan_routines.filter((r) => r.plan_id !== pid).concat(routines.map((r) => ({ ...r, plan_id: pid })));
      db.cells = db.cells.filter((c) => c.plan_id !== pid).concat(cells.map((c) => ({ ...c, plan_id: pid })));
      return plan;
    });
  },

  async applyImport(branchId, ops) {
    // 메모리에서 전부 적용한 뒤 한 번에 저장 → 중간 실패 시 파일은 그대로
    mutate((db) => {
      for (const m of ops.memberInserts) db.members.push({ ...m, id: uuid(), branch_id: branchId });
      for (const u of ops.memberUpdates) {
        const m = db.members.find((x) => x.id === u.id && x.branch_id === branchId);
        if (!m) throw notFound();
        const { id: _id, ...rest } = u;
        Object.assign(m, rest);
      }
      for (const r of ops.routineInserts) db.routines.push({ ...r, id: uuid(), branch_id: branchId });
      for (const u of ops.routineUpdates) {
        const r = db.routines.find((x) => x.id === u.id && x.branch_id === branchId);
        if (!r) throw notFound();
        const { id: _id, ...rest } = u;
        Object.assign(r, rest);
      }
    });
  },
};
