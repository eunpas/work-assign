'use client';
import { slotToTime, SLOT_COUNT } from '@/lib/time';
import { fmtNo, type PlanRoutine } from '@/lib/types';
import type { Grid } from '@/lib/plan-utils';
import { PlaceBadge } from './bits';

interface Item {
  start: number;
  end: number;
  kind: 'work' | 'absent' | 'break';
  label: string;
  routine?: PlanRoutine;
  with?: string[];
}

/** 내 일정만 보기 (F16) — 시간순 목록 */
export function MySchedule({
  memberId,
  name,
  grid,
  blocked,
  routines,
  names,
}: {
  memberId: string;
  name: string;
  grid: Grid;
  blocked: Record<string, (string | null)[]>;
  routines: Record<string, PlanRoutine>;
  names: Record<string, string>;
}) {
  const row = grid[memberId] ?? [];
  const bl = blocked[memberId] ?? [];
  const items: Item[] = [
    { start: 24, end: 30, kind: 'break', label: '🍱 점심시간' },
    { start: 48, end: 54, kind: 'break', label: '🏃 체육시간' },
  ];
  let s = 0;
  while (s < SLOT_COUNT) {
    const rid = row[s];
    const reason = bl[s];
    if (rid) {
      let e = s;
      while (e < SLOT_COUNT && row[e] === rid) e++;
      const r = routines[rid];
      const coworkers = Object.entries(grid)
        .filter(([mid, rr]) => mid !== memberId && rr.slice(s, e).includes(rid))
        .map(([mid]) => names[mid]);
      items.push({ start: s, end: e, kind: 'work', label: r ? r.name : '?', routine: r, with: coworkers });
      s = e;
    } else if (reason && !(s >= 24 && s < 30) && s < 48) {
      let e = s;
      while (e < SLOT_COUNT && bl[e] === reason && !row[e] && !(e >= 24 && e < 30) && e < 48) e++;
      items.push({ start: s, end: e, kind: 'absent', label: `부재 · ${reason}` });
      s = e;
    } else s++;
  }
  items.sort((a, b) => a.start - b.start);
  const work = items.filter((i) => i.kind === 'work');
  const minutes = work.reduce((a, i) => a + (i.end - i.start) * 10, 0);
  const places = new Set(work.map((w) => w.routine?.place));

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-brand-600">내 일정</p>
          <h3 className="text-xl font-extrabold">{name} 님의 하루 ☀️</h3>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="chip bg-brand-50 text-brand-700">작업 {work.length}개</span>
          <span className="chip bg-sky-50 text-sky-700">{Math.floor(minutes / 60)}시간 {minutes % 60}분</span>
          <span className="chip bg-amber-50 text-amber-700">장소 {[...places].filter(Boolean).join('·') || '-'}</span>
        </div>
      </div>
      {work.length === 0 && <p className="mt-4 text-sm text-slate-500">오늘 배정된 작업이 없어요 🙌</p>}
      <ol className="mt-4 space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${it.kind === 'work' ? 'border-slate-100 bg-white' : it.kind === 'absent' ? 'absent border-transparent' : 'border-dashed border-slate-200 bg-slate-50/60'}`}
          >
            <div className="w-[104px] shrink-0 text-sm font-bold tabular-nums text-slate-700">
              {slotToTime(it.start)}
              <span className="text-slate-300"> – </span>
              {it.end >= SLOT_COUNT ? '17:00' : slotToTime(it.end)}
            </div>
            {it.routine ? (
              <>
                <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: it.routine.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md px-1.5 text-[11px] font-bold tabular-nums" style={{ background: it.routine.color }}>
                      {fmtNo(it.routine.routine_no)}
                    </span>
                    <span className="truncate font-semibold">{it.label}</span>
                    <PlaceBadge place={it.routine.place} />
                  </div>
                  {it.with && it.with.length > 0 && <p className="mt-0.5 text-xs text-slate-500">함께: {it.with.join(', ')}</p>}
                </div>
              </>
            ) : (
              <span className={`text-sm ${it.kind === 'absent' ? 'font-semibold text-slate-600' : 'text-slate-400'}`}>{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
