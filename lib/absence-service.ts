import { store } from './db';
import { HttpError } from './server';
import type { Absence, AbsenceInput } from './types';

const startKey = (a: Pick<Absence, 'start_date' | 'start_time'>) => `${a.start_date} ${a.start_time}`;
const endKey = (a: Pick<Absence, 'end_date' | 'end_time'>) => `${a.end_date} ${a.end_time}`;

/** 같은 사람의 겹치는 부재 확인 → merge=true면 하나로 합침 */
export async function saveAbsence(branchId: string, input: AbsenceInput, merge: boolean, excludeId?: string) {
  const s = store();
  const members = await s.listMembers(branchId);
  if (!members.some((m) => m.id === input.member_id)) throw new HttpError(400, '이 지사의 팀원이 아니에요');
  const near = await s.listAbsences(branchId, input.start_date, input.end_date);
  const overlaps = near.filter(
    (a) => a.id !== excludeId && a.member_id === input.member_id && startKey(a) < endKey(input) && startKey(input) < endKey(a),
  );
  if (overlaps.length && !merge) throw new HttpError(409, '같은 사람의 부재 시간이 겹쳐요. 하나로 합칠까요?', 'overlap', { overlaps });
  let final = input;
  if (overlaps.length) {
    const all = [input, ...overlaps];
    const first = all.reduce((x, y) => (startKey(y) < startKey(x) ? y : x));
    const last = all.reduce((x, y) => (endKey(y) > endKey(x) ? y : x));
    final = {
      ...input,
      start_date: first.start_date,
      start_time: first.start_time,
      end_date: last.end_date,
      end_time: last.end_time,
      all_day: first.start_time === '08:00' && last.end_time === '17:00' && all.every((a) => a.all_day),
    };
    await s.deleteAbsences(branchId, overlaps.map((a) => a.id));
  }
  if (excludeId) return s.updateAbsence(branchId, excludeId, final);
  return s.createAbsence(branchId, final);
}
