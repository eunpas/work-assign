'use client';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { absenceRangeOn, addDays, minToTime, prettyDate, todayKST } from '@/lib/time';
import type { Absence, Member } from '@/lib/types';
import { AbsenceForm, REASON_ICON } from '@/components/AbsenceForm';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';

export default function AbsencesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const toast = useToast();
  const [day, setDay] = useState(todayKST());
  const [members, setMembers] = useState<Member[]>([]);
  const [rows, setRows] = useState<Absence[] | null>(null);
  const [editing, setEditing] = useState<Absence | null>(null);

  const from = addDays(day, -30);
  const to = addDays(day, 90);
  const load = useCallback(async () => {
    const [m, a] = await Promise.all([api<{ members: Member[] }>(`/api/b/${code}/members`), api<{ absences: Absence[] }>(`/api/b/${code}/absences?from=${from}&to=${to}`)]);
    setMembers(m.members.filter((x) => x.active));
    setRows(a.absences);
  }, [code, from, to]);
  useEffect(() => {
    load().catch((e) => toast(e.message, 'error'));
  }, [load, toast]);

  const names = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);
  const onDay = (rows ?? [])
    .map((a) => ({ a, r: absenceRangeOn(a, day) }))
    .filter((x) => x.r);
  const week = Array.from({ length: 7 }, (_, i) => addDays(day, i - 3));

  const remove = async (a: Absence) => {
    if (!confirm(`${names[a.member_id]} 님의 ${a.start_date}${a.start_date !== a.end_date ? ` ~ ${a.end_date}` : ''} 부재를 삭제할까요?`)) return;
    await api(`/api/b/${code}/absences/${a.id}`, { method: 'DELETE' });
    toast('삭제했어요');
    load();
  };

  const fmtRange = (a: Absence) => {
    if (a.start_date === a.end_date) return a.all_day ? `${a.start_date} 종일` : `${a.start_date} ${a.start_time}–${a.end_time}`;
    return a.all_day ? `${a.start_date} → ${a.end_date} 종일` : `${a.start_date} ${a.start_time} → ${a.end_date} ${a.end_time}`;
  };

  return (
    <main className="mx-auto grid max-w-6xl items-start gap-5 px-6 py-6 lg:grid-cols-[360px_1fr]">
      <section className="card scroll-thin p-5 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-92px)] lg:overflow-y-auto">
        <p className="text-sm font-semibold text-brand-600">부재 미리 등록</p>
        <h1 className="mb-1 text-xl font-extrabold">🌴 부재 추가</h1>
        <p className="mb-4 text-xs text-slate-500">여러 날 부재도 한 번에. 등록하면 해당 날짜 배정하기 화면에 자동으로 들어가요.</p>
        {members.length > 0 && <AbsenceForm code={code} members={members} date={day} onSaved={load} />}
      </section>

      <section className="space-y-5">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">📅 날짜별 보기</h2>
            <input type="date" className="input !w-44" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const n = new Set((rows ?? []).filter((a) => absenceRangeOn(a, d)).map((a) => a.member_id)).size;
              return (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={`rounded-2xl px-1 py-2 text-center transition ${d === day ? 'bg-ink text-white' : 'bg-slate-50 hover:bg-slate-100'}`}
                >
                  <div className="text-[11px] opacity-70">{prettyDate(d).slice(5)}</div>
                  <div className="text-lg font-extrabold tabular-nums">{n}</div>
                  <div className="text-[10px] opacity-60">명</div>
                </button>
              );
            })}
          </div>
          <ul className="mt-4 space-y-1.5">
            {onDay.map(({ a, r }) => (
              <li key={a.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span>{REASON_ICON[a.reason]}</span>
                <b>{names[a.member_id] ?? '(사용중지)'}</b>
                <span className="tabular-nums text-slate-600">{r![0] === 480 && r![1] === 1020 ? '종일' : `${minToTime(r![0])}–${minToTime(r![1])}`}</span>
                <span className="text-xs text-slate-400">{a.reason}</span>
                {a.start_date !== a.end_date && <span className="chip !h-5 bg-sky-50 !px-1.5 !text-[10px] text-sky-700">여러 날</span>}
              </li>
            ))}
            {rows && !onDay.length && <li className="text-sm text-slate-400">{prettyDate(day)}에는 부재가 없어요</li>}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 font-bold">전체 목록</div>
          {!rows ? (
            <div className="space-y-2 p-5">
              <div className="skeleton h-10" />
              <div className="skeleton h-10" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 first:border-0">
                    <td className="py-2.5 pl-5">{REASON_ICON[a.reason]}</td>
                    <td className="whitespace-nowrap font-semibold">{names[a.member_id] ?? '(사용중지)'}</td>
                    <td className="whitespace-nowrap tabular-nums text-slate-600">{fmtRange(a)}</td>
                    <td className="text-slate-500">
                      {a.reason}
                      {a.note && <span className="ml-1 text-xs text-slate-400">· {a.note}</span>}
                    </td>
                    <td className="whitespace-nowrap pr-5 text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(a)}>
                        수정
                      </button>{' '}
                      <button className="btn btn-danger btn-sm" onClick={() => remove(a)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td className="py-10 text-center text-slate-400">등록된 부재가 없어요</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="부재 수정">
        {editing && (
          <AbsenceForm
            code={code}
            members={members}
            date={editing.start_date}
            initial={editing}
            onSaved={() => {
              setEditing(null);
              load();
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </main>
  );
}
