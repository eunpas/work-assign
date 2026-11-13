'use client';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { isDue } from '@/lib/cycle';
import { todayKST } from '@/lib/time';
import { CYCLE_LABEL, CYCLES, DURATIONS, fmtNo, HEADCOUNTS, PLACES, type Cycle, type Place, type Routine } from '@/lib/types';
import { PlaceBadge, Toggle } from '@/components/bits';
import { ImportPanel } from '@/components/ImportPanel';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';

type Draft = Omit<Routine, 'id' | 'branch_id'>;

export default function RoutinesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const toast = useToast();
  const today = todayKST();
  const [rows, setRows] = useState<Routine[] | null>(null);
  const [q, setQ] = useState('');
  const [cycle, setCycle] = useState<Cycle | 'all' | 'due'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [edit, setEdit] = useState<{ id: string | null; d: Draft } | null>(null);

  const load = useCallback(() => api<{ routines: Routine[] }>(`/api/b/${code}/routines`).then((r) => setRows(r.routines)), [code]);
  useEffect(() => {
    load().catch((e) => toast(e.message, 'error'));
  }, [load, toast]);

  const list = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        if (!showInactive && !r.active) return false;
        if (cycle === 'due' && !(r.cycle !== 'daily' && isDue(r.cycle, r.anchor_date, today))) return false;
        if (cycle !== 'all' && cycle !== 'due' && r.cycle !== cycle) return false;
        if (q && !(r.name.includes(q) || fmtNo(r.routine_no).includes(q))) return false;
        return true;
      }),
    [rows, showInactive, cycle, q, today],
  );

  const active = (rows ?? []).filter((r) => r.active);
  const dailyLoad = active.filter((r) => r.cycle === 'daily').reduce((a, r) => a + r.duration_min * r.headcount, 0);

  const openNew = () => {
    const next = Math.max(0, ...(rows ?? []).map((r) => r.routine_no)) + 1;
    setEdit({ id: null, d: { routine_no: next, name: '', place: 'A', duration_min: 30, headcount: 2, cycle: 'daily', anchor_date: null, active: true } });
  };

  const save = async () => {
    if (!edit) return;
    try {
      if (edit.id) await api(`/api/b/${code}/routines/${edit.id}`, { method: 'PATCH', body: edit.d });
      else await api(`/api/b/${code}/routines`, { body: edit.d });
      toast(edit.id ? '작업을 수정했어요' : '작업을 추가했어요');
      setEdit(null);
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const toggle = async (r: Routine, v: boolean) => {
    try {
      await api(`/api/b/${code}/routines/${r.id}`, { method: 'PATCH', body: { active: v } });
      toast(v ? '다시 사용해요' : '사용중지했어요 (과거 배정표는 그대로)');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const d = edit?.d;
  const set = (p: Partial<Draft>) => setEdit((e) => (e ? { ...e, d: { ...e.d, ...p } } : e));

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-600">작업 루틴 관리</p>
          <h1 className="text-2xl font-extrabold">🧰 작업 루틴 {active.length}개</h1>
          <p className="mt-1 text-sm text-slate-500">
            일일작업 소요량 <b className="text-slate-700">{dailyLoad.toLocaleString()}분</b> (사람×분)
          </p>
        </div>
        <ImportPanel code={code} onApplied={load} />
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input className="input !w-64" placeholder="🔍 번호·작업명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="scroll-thin flex gap-1 overflow-x-auto">
          {(['all', 'due', ...CYCLES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`chip shrink-0 border transition ${cycle === c ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              {c === 'all' ? '전체' : c === 'due' ? '★ 오늘 해당' : CYCLE_LABEL[c]}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" className="accent-brand-500" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          사용중지 포함
        </label>
        <button className="btn btn-primary" onClick={openNew}>
          + 작업 추가
        </button>
      </div>

      <div className="card overflow-hidden">
        {!rows ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton h-10" />
            ))}
          </div>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-2.5 pl-5">번호</th>
                  <th>작업명</th>
                  <th>장소</th>
                  <th>시간</th>
                  <th>인원</th>
                  <th>주기</th>
                  <th>기준일</th>
                  <th>사용</th>
                  <th className="pr-5" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const due = r.cycle !== 'daily' && isDue(r.cycle, r.anchor_date, today);
                  return (
                    <tr key={r.id} className={`border-t border-slate-100 hover:bg-slate-50/60 ${r.active ? '' : 'opacity-50'}`}>
                      <td className="py-2 pl-5 font-bold tabular-nums">{fmtNo(r.routine_no)}</td>
                      <td className="font-medium">
                        {r.name}
                        {due && <span className="chip !h-5 ml-2 bg-amber-100 !px-1.5 !text-[10px] text-amber-700">★ 오늘 해당 가능</span>}
                      </td>
                      <td>
                        <PlaceBadge place={r.place} />
                      </td>
                      <td className="tabular-nums">{r.duration_min}분</td>
                      <td className="tabular-nums">{r.headcount}명</td>
                      <td>
                        <span className={`chip ${r.cycle === 'daily' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>{CYCLE_LABEL[r.cycle]}</span>
                      </td>
                      <td className="tabular-nums text-slate-500">{r.anchor_date ?? '—'}</td>
                      <td>
                        <Toggle on={r.active} onChange={(v) => toggle(r, v)} />
                      </td>
                      <td className="pr-5 text-right">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEdit({ id: r.id, d: { ...r } })}>
                          수정
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!list.length && <p className="py-10 text-center text-sm text-slate-400">해당하는 작업이 없어요</p>}
          </div>
        )}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? '작업 수정' : '새 작업'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEdit(null)}>
              취소
            </button>
            <button className="btn btn-primary" onClick={save}>
              저장
            </button>
          </>
        }
      >
        {d && (
          <div className="space-y-4">
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <div>
                <label className="label">루틴번호</label>
                <input className="input" type="number" min={1} max={999} value={d.routine_no} onChange={(e) => set({ routine_no: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">작업명</label>
                <input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="예: 통신실 온습도 점검" />
              </div>
            </div>
            <Pick label="장소" options={PLACES} value={d.place} onChange={(v) => set({ place: v as Place })} />
            <Pick label="작업시간(분)" options={DURATIONS} value={d.duration_min} onChange={(v) => set({ duration_min: Number(v) })} />
            <Pick label="필요인원(명)" options={HEADCOUNTS} value={d.headcount} onChange={(v) => set({ headcount: Number(v) })} />
            {d.headcount === 1 && <p className="-mt-2 text-xs text-slate-500">1명 작업은 기술자만 맡아요.</p>}
            <Pick label="주기" options={CYCLES} value={d.cycle} format={(c) => CYCLE_LABEL[c as Cycle]} onChange={(v) => set({ cycle: v as Cycle })} />
            {d.cycle !== 'daily' && (
              <div>
                <label className="label">기준일 (주기 계산 기준)</label>
                <input className="input" type="date" value={d.anchor_date ?? ''} onChange={(e) => set({ anchor_date: e.target.value || null })} />
                {d.anchor_date && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    오늘({today})은 {isDue(d.cycle, d.anchor_date, today) ? '★ 해당 가능한 날이에요' : '해당하는 날이 아니에요'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </main>
  );
}

function Pick<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            type="button"
            key={String(o)}
            onClick={() => onChange(o)}
            className={`chip !h-8 min-w-11 justify-center border !px-3 transition ${value === o ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200'}`}
          >
            {format ? format(o) : String(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
