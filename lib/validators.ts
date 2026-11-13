import { HttpError } from './server';
import { isHalfHour, isValidDate, timeToMin } from './time';
import { CYCLES, GRADES, PLACES, REASONS, ROLES, type AbsenceInput, type MemberInput, type RoutineInput } from './types';

const bad = (msg: string) => new HttpError(400, msg);

export function memberInput(b: Record<string, unknown>, partial = false): Partial<MemberInput> {
  const out: Partial<MemberInput> = {};
  if (!partial || 'name' in b) {
    const name = String(b.name ?? '').trim();
    if (!name || name.length > 30) throw bad('이름을 1~30자로 입력해 주세요');
    out.name = name;
  }
  if (!partial || 'grade' in b) {
    if (!GRADES.includes(b.grade as never)) throw bad('등급이 올바르지 않아요');
    out.grade = b.grade as MemberInput['grade'];
  }
  if (!partial || 'role' in b) {
    if (!ROLES.includes(b.role as never)) throw bad('역할이 올바르지 않아요');
    out.role = b.role as MemberInput['role'];
  }
  if (!partial || 'sort_order' in b) {
    const n = Number(b.sort_order ?? 999);
    if (!Number.isInteger(n) || n < 1 || n > 9999) throw bad('표시순서가 올바르지 않아요');
    out.sort_order = n;
  }
  if (!partial || 'active' in b) out.active = b.active === undefined ? true : !!b.active;
  return out;
}

export function routineInput(b: Record<string, unknown>, partial = false): Partial<RoutineInput> {
  const out: Partial<RoutineInput> = {};
  if (!partial || 'routine_no' in b) {
    const n = Number(b.routine_no);
    if (!Number.isInteger(n) || n < 1 || n > 999) throw bad('루틴번호는 1~999 숫자예요');
    out.routine_no = n;
  }
  if (!partial || 'name' in b) {
    const name = String(b.name ?? '').trim();
    if (!name || name.length > 60) throw bad('작업명을 입력해 주세요');
    out.name = name;
  }
  if (!partial || 'place' in b) {
    if (!PLACES.includes(b.place as never)) throw bad('장소는 A/B/C 중 하나예요');
    out.place = b.place as RoutineInput['place'];
  }
  if (!partial || 'duration_min' in b) {
    const d = Number(b.duration_min);
    if (![10, 20, 30, 40, 50, 60].includes(d)) throw bad('작업시간은 10~60분, 10분 단위예요');
    out.duration_min = d;
  }
  if (!partial || 'headcount' in b) {
    const h = Number(b.headcount);
    if (![1, 2, 3].includes(h)) throw bad('필요인원은 1~3명이에요');
    out.headcount = h;
  }
  if (!partial || 'cycle' in b) {
    if (!CYCLES.includes(b.cycle as never)) throw bad('주기가 올바르지 않아요');
    out.cycle = b.cycle as RoutineInput['cycle'];
  }
  if (!partial || 'anchor_date' in b) {
    const a = b.anchor_date ? String(b.anchor_date) : null;
    if (a && !isValidDate(a)) throw bad('기준일 형식이 올바르지 않아요');
    out.anchor_date = a;
  }
  if (out.cycle && out.cycle !== 'daily' && 'anchor_date' in out && !out.anchor_date) throw bad('일일 외 주기는 기준일이 필요해요');
  if (!partial || 'active' in b) out.active = b.active === undefined ? true : !!b.active;
  return out;
}

export function absenceInput(b: Record<string, unknown>): AbsenceInput {
  const all_day = !!b.all_day;
  const start_date = String(b.start_date ?? '');
  const end_date = String(b.end_date ?? start_date);
  if (!isValidDate(start_date) || !isValidDate(end_date)) throw bad('날짜를 확인해 주세요');
  const start_time = all_day ? '08:00' : String(b.start_time ?? '');
  const end_time = all_day ? '17:00' : String(b.end_time ?? '');
  if (!isHalfHour(start_time) || !isHalfHour(end_time)) throw bad('시각은 08:00~17:00, 30분 단위로 골라 주세요');
  if (timeToMin(start_time) > 16 * 60 + 30 || timeToMin(end_time) < 8 * 60 + 30) throw bad('시작은 16:30까지, 종료는 08:30부터예요');
  if (end_date < start_date || (end_date === start_date && timeToMin(end_time) <= timeToMin(start_time))) throw bad('종료가 시작보다 뒤여야 해요');
  if (!REASONS.includes(b.reason as never)) throw bad('사유를 골라 주세요');
  const member_id = String(b.member_id ?? '');
  if (!member_id) throw bad('사람을 골라 주세요');
  const note = b.note ? String(b.note).slice(0, 200) : null;
  return { member_id, start_date, end_date, start_time, end_time, all_day, reason: b.reason as AbsenceInput['reason'], note };
}
