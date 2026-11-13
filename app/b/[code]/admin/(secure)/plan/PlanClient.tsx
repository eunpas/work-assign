'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, download } from '@/lib/client';
import { assignColors } from '@/lib/colors';
import { isDue } from '@/lib/cycle';
import { autoAssign } from '@/lib/scheduler/assign';
import { validatePlan, WARNING_LABEL, type PlanWarning } from '@/lib/scheduler/validate';
import { cellsFromGrid, gridFromCells, routineSpans, spanLabel, type Grid } from '@/lib/plan-utils';
import { absenceRangeOn, blockedMap, breakOf, minToTime, prettyDate, SLOT_COUNT } from '@/lib/time';
import { CYCLE_LABEL, fmtNo, isTech, type Absence, type PlanRoutine, type Routine } from '@/lib/types';
import { DateNav, PlaceBadge, Stat } from '@/components/bits';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { Legend } from '@/components/Legend';
import { AbsenceForm, REASON_ICON } from '@/components/AbsenceForm';
import { ConfirmModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import type { PlanResponse } from '../../../ViewClient';

type Filter = 'all' | 'due' | 'daily' | 'periodic' | 'checked';
type RoutineRow = Routine & { due: boolean };

function countMoves(grid: Grid, places: Record<string, string>) {
  let moves = 0;
  for (const row of Object.values(grid)) {
    let last: string | null = null;
    let lastId: string | null = null;
    for (const rid of row) {
      if (!rid || rid === lastId) continue;
      const p = places[rid];
      if (last && p && p !== last) moves++;
      last = p ?? last;
      lastId = rid;
    }
  }
  return moves;
}

export function PlanClient({ code, date }: { code: string; date: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<PlanResponse['members']>([]);
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [grid, setGrid] = useState<Grid>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [edited, setEdited] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [askOverwrite, setAskOverwrite] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState<string | null>(null);
  const [showAbsForm, setShowAbsForm] = useState(false);
  const [lastRun, setLastRun] = useState<{ ms: number; iterations: number } | null>(null);

  // ---- 불러오기 ----
  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([api<PlanResponse>(`/api/b/${code}/plan?date=${date}`), api<{ routines: Routine[] }>(`/api/b/${code}/routines`)]);
        const ids = p.members.map((m) => m.id);
        const planIds = new Set(p.plan?.routines.map((x) => x.routine_id));
        const rows = r.routines.filter((x) => x.active || planIds.has(x.id)).map((x) => ({ ...x, due: isDue(x.cycle, x.anchor_date, date) }));
        setMembers(p.members);
        setAbsences(p.absences);
        setRoutines(rows);
        if (p.plan) {
          setChecked(planIds);
          setGrid(gridFromCells(p.plan.cells, ids));
          setReasons(Object.fromEntries(p.plan.routines.filter((x) => x.unassigned_reason).map((x) => [x.routine_id, x.unassigned_reason!])));
          setSavedAt(p.plan.updated_at);
          setEdited(true);
        } else {
          setChecked(new Set(rows.filter((x) => x.active && x.cycle === 'daily').map((x) => x.id)));
          setGrid(gridFromCells([], ids));
        }
      } catch (e) {
        toast((e as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [code, date, toast]);

  const reloadAbsences = useCallback(async () => {
    const r = await api<{ absences: Absence[] }>(`/api/b/${code}/absences?from=${date}&to=${date}`);
    setAbsences(r.absences);
  }, [code, date]);

  // 저장 안 한 변경 경고
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // ---- 파생 값 ----
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const names = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);
  const blocked = useMemo(() => blockedMap(absences, date), [absences, date]);
  const checkedRoutines = useMemo(() => routines.filter((r) => checked.has(r.id)), [routines, checked]);
  const colors = useMemo(() => assignColors(checkedRoutines), [checkedRoutines]);
  const planRoutines: PlanRoutine[] = useMemo(
    () =>
      checkedRoutines.map((r) => ({
        routine_id: r.id,
        routine_no: r.routine_no,
        name: r.name,
        place: r.place,
        duration_min: r.duration_min,
        headcount: r.headcount,
        color: colors[r.id],
        unassigned_reason: reasons[r.id] ?? null,
      })),
    [checkedRoutines, colors, reasons],
  );
  const gridRoutines = useMemo(() => Object.fromEntries(planRoutines.map((r) => [r.routine_id, { id: r.routine_id, ...r }])), [planRoutines]);
  const spans = useMemo(() => routineSpans(grid), [grid]);
  const warnings = useMemo(() => validatePlan({ members, routines: planRoutines, grid, blocked }), [members, planRoutines, grid, blocked]);
  const warnCells = useMemo(() => new Set(warnings.flatMap((w) => w.cells)), [warnings]);
  const hasAny = Object.keys(spans).length > 0;
  const unassigned = hasAny ? planRoutines.filter((r) => !spans[r.routine_id]) : [];
  const moves = useMemo(() => countMoves(grid, Object.fromEntries(planRoutines.map((r) => [r.routine_id, r.place]))), [grid, planRoutines]);
  const need = checkedRoutines.reduce((a, r) => a + r.duration_min * r.headcount, 0);
  const capacity = useMemo(
    () => {
      let total = 0;
      for (const m of members) for (let s = 0; s < SLOT_COUNT; s++) if (!breakOf(s) && !blocked[m.id]?.[s]) total += 10;
      return total;
    },
    [members, blocked],
  );
  const load = capacity ? Math.round((need / capacity) * 100) : 0;

  // ---- 작업 체크 ----
  const setCheck = (ids: string[], on: boolean) => {
    setChecked((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });
    if (!on) {
      const rm = new Set(ids);
      setGrid((g) => {
        let changed = false;
        const out: Grid = {};
        for (const [k, row] of Object.entries(g))
          out[k] = row.map((v) => {
            if (v && rm.has(v)) {
              changed = true;
              return null;
            }
            return v;
          });
        return changed ? out : g;
      });
    }
    setDirty(true);
  };

  const visible = useMemo(() => {
    const qq = q.trim();
    return routines.filter((r) => {
      if (filter === 'due' && !(r.due && r.cycle !== 'daily')) return false;
      if (filter === 'daily' && r.cycle !== 'daily') return false;
      if (filter === 'periodic' && r.cycle === 'daily') return false;
      if (filter === 'checked' && !checked.has(r.id)) return false;
      if (qq && !(r.name.includes(qq) || fmtNo(r.routine_no).includes(qq))) return false;
      return true;
    });
  }, [routines, filter, q, checked]);
  const dueCount = routines.filter((r) => r.due && r.cycle !== 'daily').length;

  // ---- 자동 배정 ----
  const runAssign = () => {
    setRunning(true);
    setTimeout(() => {
      const sm = members.map((m) => ({ id: m.id, tech: isTech(m.grade), blocked: Array.from({ length: SLOT_COUNT }, (_, s) => !!blocked[m.id]?.[s]) }));
      const res = autoAssign(
        sm,
        planRoutines.map((r) => ({ id: r.routine_id, place: r.place, duration_min: r.duration_min, headcount: r.headcount })),
        { timeLimitMs: 1500, seed: Date.now() },
      );
      setGrid(gridFromCells(res.cells, memberIds));
      setReasons(Object.fromEntries(res.unassigned.map((u) => [u.routine_id, u.reason])));
      setDirty(true);
      setEdited(false);
      setRunning(false);
      setLastRun({ ms: res.ms, iterations: res.iterations });
      toast(`${(res.ms / 1000).toFixed(1)}초 만에 배정 완료 · 미배정 ${res.unassigned.length}건 · 장소 이동 ${res.moves}회`, res.unassigned.length ? 'info' : 'success');
    }, 60);
  };
  const onAssignClick = () => {
    if (!checkedRoutines.length) return toast('오늘 할 작업을 먼저 체크해 주세요', 'error');
    if (edited && cellsFromGrid(grid).length) setAskOverwrite(true);
    else runAssign();
  };

  // ---- 칸 선택·수정 ----
  const [sel, setSel] = useState<{ a: [number, number]; b: [number, number] } | null>(null);
  const [pop, setPop] = useState<{ x: number; y: number } | null>(null);
  const [popQ, setPopQ] = useState('');
  const dragging = useRef(false);

  const selected = useMemo(() => {
    const out = new Set<string>();
    if (!sel) return out;
    const [r0, r1] = [Math.min(sel.a[0], sel.b[0]), Math.max(sel.a[0], sel.b[0])];
    const [s0, s1] = [Math.min(sel.a[1], sel.b[1]), Math.max(sel.a[1], sel.b[1])];
    for (let r = r0; r <= r1; r++)
      for (let s = s0; s <= s1; s++) {
        const m = members[r];
        if (m && !breakOf(s) && !blocked[m.id]?.[s]) out.add(`${m.id}:${s}`);
      }
    return out;
  }, [sel, members, blocked]);

  const onCellDown = useCallback((mi: number, s: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    setPop(null);
    setSel({ a: [mi, s], b: [mi, s] });
  }, []);
  const onCellEnter = useCallback((mi: number, s: number) => {
    if (dragging.current) setSel((p) => (p ? { ...p, b: [mi, s] } : p));
  }, []);
  useEffect(() => {
    const up = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      setPopQ('');
      setPop({ x: Math.min(e.clientX + 8, window.innerWidth - 340), y: Math.min(e.clientY + 8, window.innerHeight - 420) });
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPop(null);
        setSel(null);
      }
    };
    window.addEventListener('mouseup', up);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('keydown', key);
    };
  }, []);

  const applyCells = (rid: string | null) => {
    setGrid((g) => {
      const out: Grid = { ...g };
      for (const k of selected) {
        const [mid, s] = k.split(':');
        out[mid] = [...(out[mid] ?? Array(SLOT_COUNT).fill(null))];
        out[mid][Number(s)] = rid;
      }
      return out;
    });
    if (rid) setReasons((r) => (r[rid] ? Object.fromEntries(Object.entries(r).filter(([k]) => k !== rid)) : r));
    setDirty(true);
    setEdited(true);
    setPop(null);
    setSel(null);
  };

  // ---- 저장·엑셀 ----
  const save = async () => {
    setSaving(true);
    try {
      const r = await api<{ updated_at: string }>(`/api/b/${code}/plan`, { method: 'PUT', body: { date, routines: planRoutines, cells: cellsFromGrid(grid) } });
      setSavedAt(r.updated_at);
      setDirty(false);
      toast(warnings.length ? `저장했어요 (경고 ${warnings.length}건은 그대로 남아 있어요)` : '저장했어요');
      return true;
    } catch (e) {
      toast((e as Error).message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };
  const exportXlsx = async () => {
    if ((dirty || !savedAt) && !(await save())) return;
    download(`/api/b/${code}/export?date=${date}`);
  };

  const todaysAbsences = absences
    .map((a) => ({ a, r: absenceRangeOn(a, date) }))
    .filter((x) => x.r)
    .sort((x, y) => (names[x.a.member_id] ?? '').localeCompare(names[y.a.member_id] ?? ''));

  if (loading)
    return (
      <div className="mx-auto grid max-w-[1600px] gap-5 px-6 py-6 lg:grid-cols-[380px_1fr]">
        <div className="skeleton h-[640px]" />
        <div className="skeleton h-[640px]" />
      </div>
    );

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-600">배정하기</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{prettyDate(date)}</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DateNav date={date} basePath={`/b/${code}/admin/plan`} guard={() => !dirty || confirm('저장하지 않은 변경이 있어요. 그래도 이동할까요?')} />
          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
          <span className="text-xs text-slate-400">{dirty ? '● 저장 안 됨' : savedAt ? `저장됨 ${new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '아직 저장 전'}</span>
          <button className="btn btn-ghost" onClick={save} disabled={saving || (!dirty && !!savedAt)}>
            💾 {saving ? '저장 중…' : '저장'}
          </button>
          <button className="btn btn-ghost" onClick={exportXlsx}>
            ⬇️ 엑셀 내려받기
          </button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ---------- 왼쪽: 작업·부재 ---------- */}
        <aside className="scroll-thin space-y-5 lg:sticky lg:top-[76px] lg:-mr-2 lg:max-h-[calc(100vh-92px)] lg:overflow-y-auto lg:pr-2 lg:pb-2">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">
                <span className="mr-1.5 inline-grid size-6 place-items-center rounded-full bg-brand-500 text-xs text-white">1</span>오늘 작업
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                {checked.size}개 · {need.toLocaleString()}분
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <input className="input !h-9" placeholder="🔍 번호·작업명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="scroll-thin mt-2 flex gap-1 overflow-x-auto pb-1">
              {(
                [
                  ['all', '전체'],
                  ['due', `★ 오늘 해당 ${dueCount}`],
                  ['daily', '일일'],
                  ['periodic', '주기'],
                  ['checked', '선택됨'],
                ] as [Filter, string][]
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`chip shrink-0 border transition ${filter === k ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5 text-xs">
              <button className="font-semibold text-brand-600 hover:underline" onClick={() => setCheck(visible.map((r) => r.id), true)}>
                보이는 것 모두 선택
              </button>
              <span className="text-slate-300">·</span>
              <button className="font-semibold text-slate-500 hover:underline" onClick={() => setCheck(visible.map((r) => r.id), false)}>
                모두 해제
              </button>
            </div>
            <ul className="scroll-thin -mx-2 mt-2 max-h-[380px] space-y-0.5 overflow-y-auto px-2">
              {visible.map((r) => {
                const on = checked.has(r.id);
                return (
                  <li key={r.id}>
                    <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition ${on ? 'bg-brand-50/70' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" className="size-4 accent-brand-500" checked={on} onChange={(e) => setCheck([r.id], e.target.checked)} />
                      <span
                        className="w-9 shrink-0 rounded-md text-center text-[11px] font-bold tabular-nums"
                        style={{ background: on ? colors[r.id] : '#f1f0f7' }}
                      >
                        {fmtNo(r.routine_no)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {r.name}
                          {!r.active && <span className="ml-1 text-[10px] text-slate-400">(사용중지)</span>}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <PlaceBadge place={r.place} /> {r.duration_min}분 · {r.headcount}명 · {CYCLE_LABEL[r.cycle]}
                        </span>
                      </span>
                      {r.due && r.cycle !== 'daily' && <span className="chip !h-5 shrink-0 bg-amber-100 !px-1.5 !text-[10px] text-amber-700">★ 오늘</span>}
                    </label>
                  </li>
                );
              })}
              {!visible.length && <li className="py-6 text-center text-sm text-slate-400">해당하는 작업이 없어요</li>}
            </ul>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">
                <span className="mr-1.5 inline-grid size-6 place-items-center rounded-full bg-brand-500 text-xs text-white">2</span>오늘 부재
              </h2>
              <span className="text-xs font-semibold text-slate-500">{new Set(todaysAbsences.map((x) => x.a.member_id)).size}명</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {todaysAbsences.map(({ a, r }) => (
                <li key={a.id} className="group flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span>{REASON_ICON[a.reason]}</span>
                  <b>{names[a.member_id] ?? '?'}</b>
                  <span className="tabular-nums text-slate-500">{r![0] === 480 && r![1] === 1020 ? '종일' : `${minToTime(r![0])}–${minToTime(r![1])}`}</span>
                  <span className="text-xs text-slate-400">{a.reason}</span>
                  {a.start_date !== a.end_date && <span className="chip !h-5 bg-sky-50 !px-1.5 !text-[10px] text-sky-700">여러 날</span>}
                  <button
                    className="ml-auto text-xs text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500"
                    onClick={async () => {
                      if (a.start_date !== a.end_date && !confirm(`${a.start_date} ~ ${a.end_date} 전체 부재가 삭제돼요. 계속할까요?`)) return;
                      await api(`/api/b/${code}/absences/${a.id}`, { method: 'DELETE' });
                      await reloadAbsences();
                      toast('부재를 삭제했어요');
                    }}
                  >
                    삭제
                  </button>
                </li>
              ))}
              {!todaysAbsences.length && <li className="text-sm text-slate-400">오늘은 모두 출근해요 🙌</li>}
            </ul>
            {showAbsForm ? (
              <div className="mt-4 rounded-2xl border border-slate-100 p-4">
                <AbsenceForm
                  code={code}
                  members={members}
                  date={date}
                  singleDay
                  onSaved={reloadAbsences}
                  onCancel={() => setShowAbsForm(false)}
                />
              </div>
            ) : (
              <button className="btn btn-soft mt-3 w-full" onClick={() => setShowAbsForm(true)}>
                + 부재 추가
              </button>
            )}
          </section>
        </aside>

        {/* ---------- 오른쪽: 배정표 ---------- */}
        <section className="min-w-0 space-y-5">
          <div className="card flex flex-wrap items-center gap-4 p-4">
            <button className="btn btn-primary btn-lg min-w-[180px]" onClick={onAssignClick} disabled={running}>
              {running ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> 배정 중…
                </>
              ) : (
                <>
                  <span className="inline-grid size-6 place-items-center rounded-full bg-white/25 text-xs">3</span> ⚡ 자동 배정
                </>
              )}
            </button>
            <div className="min-w-[180px] flex-1">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>오늘 작업량 / 가능 시간</span>
                <span className={load > 95 ? 'text-rose-500' : load > 85 ? 'text-amber-600' : 'text-emerald-600'}>{load}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, load)}%`, background: load > 95 ? '#f43f5e' : load > 85 ? '#f59e0b' : 'var(--grad)' }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Stat label="배정" value={`${hasAny ? planRoutines.length - unassigned.length : 0}/${planRoutines.length}`} tone="brand" />
              <Stat label="미배정" value={unassigned.length} tone={unassigned.length ? 'red' : 'green'} />
              <Stat label="경고" value={warnings.length} tone={warnings.length ? 'amber' : 'green'} />
              <Stat label="이동" value={`${moves}회`} />
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-500">
                💡 칸을 <b>클릭</b>하거나 <b>드래그</b>해서 여러 칸을 고른 뒤 작업번호를 지정하세요. <span className="text-slate-400">Esc로 취소</span>
              </p>
              {lastRun && (
                <span className="text-xs text-slate-400">
                  {lastRun.iterations.toLocaleString()}가지 순서를 시도 · {(lastRun.ms / 1000).toFixed(1)}초
                </span>
              )}
            </div>
            <ScheduleGrid
              members={members}
              grid={grid}
              routines={gridRoutines}
              blocked={blocked}
              editable
              selected={selected}
              warn={warnCells}
              focusRoutine={focus}
              onCellDown={onCellDown}
              onCellEnter={onCellEnter}
            />
          </div>

          {(warnings.length > 0 || unassigned.length > 0) && (
            <div className="grid gap-5 xl:grid-cols-2">
              {unassigned.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-bold text-rose-600">🚧 미배정 작업 {unassigned.length}건</h3>
                  <ul className="scroll-thin mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
                    {unassigned.map((r) => (
                      <li key={r.routine_id} className="rounded-xl bg-rose-50/60 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md px-1.5 text-[11px] font-bold" style={{ background: r.color }}>
                            {fmtNo(r.routine_no)}
                          </span>
                          <b>{r.name}</b>
                          <PlaceBadge place={r.place} />
                          <span className="text-xs text-slate-500">
                            {r.duration_min}분 · {r.headcount}명
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{reasons[r.routine_id] ?? (edited ? '직접 수정하면서 비워졌어요' : '아직 자동 배정 전이에요')}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {warnings.length > 0 && <WarningList warnings={warnings} />}
            </div>
          )}

          <div className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">🎨 범례</h3>
              <span className="text-xs text-slate-400">줄을 누르면 표에서 그 작업만 강조돼요</span>
            </div>
            <Legend routines={planRoutines} grid={grid} names={names} focus={focus} onFocus={setFocus} />
          </div>
        </section>
      </div>

      {/* 칸 선택 팝오버 */}
      {pop && selected.size > 0 && (
        <div className="fixed inset-0 z-40" onMouseDown={() => (setPop(null), setSel(null))}>
          <div
            className="animate-pop absolute w-[330px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
            style={{ left: pop.x, top: pop.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">{selected.size}칸 선택 · 작업번호 고르기</p>
              <input className="input !h-9" placeholder="번호·이름 검색" value={popQ} onChange={(e) => setPopQ(e.target.value)} autoFocus />
            </div>
            <ul className="scroll-thin max-h-[300px] overflow-y-auto p-1.5">
              <li>
                <button className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-rose-500 hover:bg-rose-50" onClick={() => applyCells(null)}>
                  🧽 비우기
                </button>
              </li>
              {[...planRoutines]
                .sort((a, b) => a.routine_no - b.routine_no)
                .filter((r) => !popQ || r.name.includes(popQ) || fmtNo(r.routine_no).includes(popQ))
                .map((r) => (
                  <li key={r.routine_id}>
                    <button className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left hover:bg-slate-50" onClick={() => applyCells(r.routine_id)}>
                      <span className="w-10 shrink-0 rounded-md text-center text-[11px] font-bold tabular-nums" style={{ background: r.color }}>
                        {fmtNo(r.routine_no)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{r.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {r.place} · {r.duration_min}분 · {r.headcount}명 · {spans[r.routine_id] ? spanLabel(spans[r.routine_id]) : '미배정'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      <ConfirmModal
        open={askOverwrite}
        title="직접 고친 내용이 있어요"
        message="자동 배정을 다시 하면 지금 표의 내용을 새 배정으로 덮어써요. 덮어쓸까요?"
        confirmText="덮어쓰기"
        onCancel={() => setAskOverwrite(false)}
        onConfirm={() => {
          setAskOverwrite(false);
          runAssign();
        }}
      />
    </div>
  );
}

function WarningList({ warnings }: { warnings: PlanWarning[] }) {
  return (
    <div className="card p-5">
      <h3 className="font-bold text-amber-600">⚠️ 규칙 경고 {warnings.length}건</h3>
      <p className="mt-0.5 text-xs text-slate-400">경고가 있어도 저장은 돼요. 표에서 빨간 테두리 칸을 확인하세요.</p>
      <ul className="scroll-thin mt-3 max-h-64 space-y-1.5 overflow-y-auto text-sm">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-2 rounded-xl bg-amber-50/70 px-3 py-2">
            <span className="chip !h-5 shrink-0 bg-white !px-1.5 !text-[10px] text-amber-700">{WARNING_LABEL[w.kind]}</span>
            <span className="text-slate-700">{w.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
