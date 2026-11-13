-- 작업배정 — Supabase 표 만들기
-- SQL 편집기에서 이 파일 전체를 실행한 뒤 seed.sql을 실행하세요.

create extension if not exists pgcrypto;

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique check (length(code) >= 10),
  admin_password_hash text not null,
  google_sheet_url text,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  name text not null,
  grade text not null check (grade in ('special','advanced','intermediate','junior','assistant')),
  role text not null check (role in ('leader','sub_leader','member')),
  sort_order int not null default 999,
  active boolean not null default true,
  unique (branch_id, name)
);

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  routine_no int not null check (routine_no between 1 and 999),
  name text not null,
  place text not null check (place in ('A','B','C')),
  duration_min int not null check (duration_min in (10,20,30,40,50,60)),
  headcount int not null check (headcount between 1 and 3),
  cycle text not null check (cycle in ('daily','weekly','biweekly','monthly','quarterly','semiannual','annual')),
  anchor_date date,
  active boolean not null default true,
  unique (branch_id, routine_no)
);

create table if not exists absences (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  start_date date not null,
  start_time time not null,
  end_date date not null,
  end_time time not null,
  all_day boolean not null default false,
  reason text not null check (reason in ('휴가','출장','교육','기타')),
  note text,
  check (extract(minute from start_time) in (0,30) and extract(minute from end_time) in (0,30)),
  check (start_time >= '08:00' and start_time <= '16:30' and end_time >= '08:30' and end_time <= '17:00'),
  check (end_date > start_date or (end_date = start_date and end_time > start_time))
);
create index if not exists absences_branch_dates on absences (branch_id, start_date, end_date);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  date date not null,
  updated_at timestamptz not null default now(),
  unique (branch_id, date)
);

create table if not exists plan_routines (
  plan_id uuid not null references plans(id) on delete cascade,
  routine_id uuid not null references routines(id),
  routine_no int not null,
  name text not null,
  place text not null,
  duration_min int not null,
  headcount int not null,
  color text not null,
  unassigned_reason text,
  primary key (plan_id, routine_id)
);

create table if not exists assignment_cells (
  plan_id uuid not null references plans(id) on delete cascade,
  member_id uuid not null references members(id),
  slot int not null check (slot between 0 and 53),
  routine_id uuid not null references routines(id),
  primary key (plan_id, member_id, slot)
);

-- 행 수준 보안: 켜고 공개 정책은 두지 않는다 (서버의 service_role 키만 접근)
alter table branches enable row level security;
alter table members enable row level security;
alter table routines enable row level security;
alter table absences enable row level security;
alter table plans enable row level security;
alter table plan_routines enable row level security;
alter table assignment_cells enable row level security;

-- 배정표 저장 (한 번에 전부 성공 / 전부 취소)
create or replace function save_plan(p_branch uuid, p_date date, p_routines jsonb, p_cells jsonb)
returns jsonb language plpgsql as $$
declare
  v_plan uuid;
  v_now timestamptz := now();
begin
  insert into plans (branch_id, date, updated_at) values (p_branch, p_date, v_now)
  on conflict (branch_id, date) do update set updated_at = excluded.updated_at
  returning id into v_plan;

  delete from plan_routines where plan_id = v_plan;
  delete from assignment_cells where plan_id = v_plan;

  insert into plan_routines (plan_id, routine_id, routine_no, name, place, duration_min, headcount, color, unassigned_reason)
  select v_plan, (r->>'routine_id')::uuid, (r->>'routine_no')::int, r->>'name', r->>'place',
         (r->>'duration_min')::int, (r->>'headcount')::int, r->>'color', nullif(r->>'unassigned_reason', '')
  from jsonb_array_elements(p_routines) r;

  insert into assignment_cells (plan_id, member_id, slot, routine_id)
  select v_plan, (c->>'member_id')::uuid, (c->>'slot')::int, (c->>'routine_id')::uuid
  from jsonb_array_elements(p_cells) c;

  return jsonb_build_object('id', v_plan, 'updated_at', v_now);
end $$;

-- 입력 양식 일괄 반영 (F21·F22, 트랜잭션)
create or replace function apply_import(p_branch uuid, p_member_inserts jsonb, p_member_updates jsonb, p_routine_inserts jsonb, p_routine_updates jsonb)
returns void language plpgsql as $$
begin
  insert into members (branch_id, name, grade, role, sort_order, active)
  select p_branch, m->>'name', m->>'grade', m->>'role', (m->>'sort_order')::int, (m->>'active')::boolean
  from jsonb_array_elements(p_member_inserts) m;

  update members t set
    name = coalesce(m->>'name', t.name),
    grade = coalesce(m->>'grade', t.grade),
    role = coalesce(m->>'role', t.role),
    sort_order = coalesce((m->>'sort_order')::int, t.sort_order),
    active = coalesce((m->>'active')::boolean, t.active)
  from jsonb_array_elements(p_member_updates) m
  where t.id = (m->>'id')::uuid and t.branch_id = p_branch;

  insert into routines (branch_id, routine_no, name, place, duration_min, headcount, cycle, anchor_date, active)
  select p_branch, (r->>'routine_no')::int, r->>'name', r->>'place', (r->>'duration_min')::int, (r->>'headcount')::int,
         r->>'cycle', (r->>'anchor_date')::date, (r->>'active')::boolean
  from jsonb_array_elements(p_routine_inserts) r;

  update routines t set
    routine_no = coalesce((r->>'routine_no')::int, t.routine_no),
    name = coalesce(r->>'name', t.name),
    place = coalesce(r->>'place', t.place),
    duration_min = coalesce((r->>'duration_min')::int, t.duration_min),
    headcount = coalesce((r->>'headcount')::int, t.headcount),
    cycle = coalesce(r->>'cycle', t.cycle),
    anchor_date = case when r ? 'anchor_date' then (r->>'anchor_date')::date else t.anchor_date end,
    active = coalesce((r->>'active')::boolean, t.active)
  from jsonb_array_elements(p_routine_updates) r
  where t.id = (r->>'id')::uuid and t.branch_id = p_branch;
end $$;

revoke execute on function save_plan(uuid, date, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function apply_import(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function save_plan(uuid, date, jsonb, jsonb) to service_role;
grant execute on function apply_import(uuid, jsonb, jsonb, jsonb, jsonb) to service_role;
