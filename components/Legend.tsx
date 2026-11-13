'use client';
import { routineSpans, spanLabel, type Grid } from '@/lib/plan-utils';
import { fmtNo, type PlanRoutine } from '@/lib/types';
import { PlaceBadge } from './bits';

export function Legend({
  routines,
  grid,
  names,
  focus,
  onFocus,
}: {
  routines: PlanRoutine[];
  grid: Grid;
  names: Record<string, string>;
  focus?: string | null;
  onFocus?: (id: string | null) => void;
}) {
  const spans = routineSpans(grid);
  const sorted = [...routines].sort((a, b) => a.routine_no - b.routine_no);
  if (!sorted.length) return null;
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold text-slate-400">
            <th className="py-2 pl-2">번호</th>
            <th>작업명</th>
            <th>장소</th>
            <th>시간</th>
            <th>인원</th>
            <th>시작–종료</th>
            <th>배정된 사람</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const sp = spans[r.routine_id];
            const on = focus === r.routine_id;
            return (
              <tr
                key={r.routine_id}
                className={`border-t border-slate-100 transition ${onFocus ? 'cursor-pointer hover:bg-brand-50/60' : ''} ${on ? 'bg-brand-50' : ''}`}
                onClick={() => onFocus?.(on ? null : r.routine_id)}
              >
                <td className="py-1.5 pl-2">
                  <span className="inline-flex h-6 min-w-11 items-center justify-center rounded-lg px-1.5 text-[11px] font-bold tabular-nums text-slate-800" style={{ background: r.color }}>
                    {fmtNo(r.routine_no)}
                  </span>
                </td>
                <td className="font-medium">{r.name}</td>
                <td>
                  <PlaceBadge place={r.place} />
                </td>
                <td className="tabular-nums text-slate-600">{r.duration_min}분</td>
                <td className="tabular-nums text-slate-600">{r.headcount}명</td>
                <td className="tabular-nums">{sp ? spanLabel(sp) : <span className="font-semibold text-rose-500">미배정</span>}</td>
                <td className="text-slate-600">{sp ? sp.members.map((id) => names[id] ?? '?').join(', ') : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
