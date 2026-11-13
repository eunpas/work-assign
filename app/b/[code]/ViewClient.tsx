'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, download } from '@/lib/client';
import { blockedMap, prettyDate } from '@/lib/time';
import { gridFromCells } from '@/lib/plan-utils';
import type { Absence, Cell, PlanRoutine } from '@/lib/types';
import { DateNav, Empty, Logo, Stat } from '@/components/bits';
import { ScheduleGrid, type GridMember } from '@/components/ScheduleGrid';
import { Legend } from '@/components/Legend';
import { MySchedule } from '@/components/MySchedule';
import { useToast } from '@/components/Toast';

export interface PlanResponse {
  branch: { name: string; code: string };
  date: string;
  isAdmin: boolean;
  members: (GridMember & { sort_order: number; active: boolean })[];
  absences: Absence[];
  plan: { updated_at: string; routines: PlanRoutine[]; cells: Cell[] } | null;
}

export function ViewClient({ code, branchName, date }: { code: string; branchName: string; date: string }) {
  const toast = useToast();
  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    api<PlanResponse>(`/api/b/${code}/plan?date=${date}`)
      .then((d) => {
        setData(d);
        try {
          const saved = localStorage.getItem(`wa_me_${code}`);
          if (saved && d.members.some((m) => m.id === saved)) setMe(saved);
        } catch {}
      })
      .catch((e) => setError(e.message));
  }, [code, date]);

  const pickMe = (id: string | null) => {
    setMe(id);
    try {
      if (id) localStorage.setItem(`wa_me_${code}`, id);
      else localStorage.removeItem(`wa_me_${code}`);
    } catch {}
  };

  const view = useMemo(() => {
    if (!data) return null;
    const grid = gridFromCells(data.plan?.cells ?? [], data.members.map((m) => m.id));
    const blocked = blockedMap(data.absences, date);
    const rmap = Object.fromEntries((data.plan?.routines ?? []).map((r) => [r.routine_id, r]));
    const gridRoutines = Object.fromEntries((data.plan?.routines ?? []).map((r) => [r.routine_id, { id: r.routine_id, ...r }]));
    const names = Object.fromEntries(data.members.map((m) => [m.id, m.name]));
    const assignedIds = new Set(data.plan?.cells.map((c) => c.routine_id));
    const unassigned = (data.plan?.routines ?? []).filter((r) => !assignedIds.has(r.routine_id));
    const absentCount = new Set(data.absences.map((a) => a.member_id)).size;
    return { grid, blocked, rmap, gridRoutines, names, unassigned, absentCount };
  }, [data, date]);

  const meMember = data?.members.find((m) => m.id === me);

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-6 py-3">
          <Logo />
          <span className="text-slate-300">/</span>
          <span className="font-bold">{branchName}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <DateNav date={date} basePath={`/b/${code}`} />
            <button
              className="btn btn-ghost btn-sm"
              disabled={!data?.plan}
              onClick={() => {
                download(`/api/b/${code}/export?date=${date}`);
                toast('엑셀 파일을 내려받고 있어요', 'info');
              }}
            >
              ⬇️ 엑셀
            </button>
            <Link href={data?.isAdmin ? `/b/${code}/admin/plan?date=${date}` : `/b/${code}/admin`} className="btn btn-soft btn-sm">
              {data?.isAdmin ? '✏️ 배정하기' : '🔐 관리자'}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-6 py-6">
        {error && (
          <div className="card p-6">
            <Empty icon="⚠️" title="배정표를 불러오지 못했어요" desc={error} />
          </div>
        )}
        {!data && !error && (
          <div className="space-y-4">
            <div className="skeleton h-24" />
            <div className="skeleton h-[480px]" />
          </div>
        )}
        {data && view && (
          <>
            <section className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-600">오늘의 배정표</p>
                <h1 className="text-3xl font-extrabold tracking-tight">{prettyDate(date)}</h1>
                {data.plan && <p className="mt-1 text-xs text-slate-400">마지막 저장 {new Date(data.plan.updated_at).toLocaleString('ko-KR')}</p>}
              </div>
              {data.plan && (
                <div className="flex flex-wrap gap-2">
                  <Stat label="작업" value={`${data.plan.routines.length}개`} tone="brand" />
                  <Stat label="인원" value={`${data.members.length}명`} />
                  <Stat label="부재" value={`${view.absentCount}명`} tone="amber" />
                  <Stat label="미배정" value={`${view.unassigned.length}건`} tone={view.unassigned.length ? 'red' : 'green'} />
                </div>
              )}
            </section>

            {!data.plan ? (
              <div className="card">
                <Empty icon="🗓️" title="아직 이 날짜의 배정표가 없어요" desc="팀장님이 배정표를 저장하면 여기에서 바로 볼 수 있어요. 다른 날짜를 골라 보세요.">
                  {data.isAdmin && (
                    <Link href={`/b/${code}/admin/plan?date=${date}`} className="btn btn-primary">
                      지금 배정하러 가기
                    </Link>
                  )}
                </Empty>
              </div>
            ) : (
              <>
                <section className="card p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">🙋 내 이름을 눌러 내 일정만 보기</span>
                    <div className="scroll-thin flex max-w-full gap-1.5 overflow-x-auto pb-1">
                      {data.members.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => pickMe(me === m.id ? null : m.id)}
                          className={`chip shrink-0 border transition ${me === m.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200'}`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {meMember && (
                    <div className="mb-4">
                      <MySchedule memberId={meMember.id} name={meMember.name} grid={view.grid} blocked={view.blocked} routines={view.rmap} names={view.names} />
                    </div>
                  )}
                  <ScheduleGrid
                    members={data.members}
                    grid={view.grid}
                    routines={view.gridRoutines}
                    blocked={view.blocked}
                    highlight={me}
                    focusRoutine={focus}
                    onNameClick={(id) => pickMe(me === id ? null : id)}
                  />
                </section>

                {view.unassigned.length > 0 && (
                  <section className="card border-rose-100 p-5">
                    <h2 className="font-bold text-rose-600">🚧 미배정 작업 {view.unassigned.length}건</h2>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {view.unassigned.map((r) => (
                        <li key={r.routine_id} className="flex gap-2">
                          <b className="tabular-nums">{String(r.routine_no).padStart(3, '0')}</b> {r.name}
                          <span className="text-slate-500">— {r.unassigned_reason ?? '배정되지 않음'}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="card p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-bold">🎨 범례</h2>
                    <span className="text-xs text-slate-400">줄을 누르면 표에서 그 작업만 강조돼요</span>
                  </div>
                  <Legend routines={data.plan.routines} grid={view.grid} names={view.names} focus={focus} onFocus={setFocus} />
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
