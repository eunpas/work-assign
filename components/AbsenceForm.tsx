'use client';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client';
import { HALF_HOURS, timeToMin } from '@/lib/time';
import { REASONS, type Absence, type Reason } from '@/lib/types';
import { ConfirmModal } from './Modal';
import { useToast } from './Toast';

const REASON_ICON: Record<Reason, string> = { 휴가: '🏖️', 출장: '🚗', 교육: '📚', 기타: '📝' };
export { REASON_ICON };

export function AbsenceForm({
  code,
  members,
  date,
  singleDay,
  initial,
  onSaved,
  onCancel,
}: {
  code: string;
  members: { id: string; name: string }[];
  date: string;
  singleDay?: boolean;
  initial?: Absence | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const toast = useToast();
  const [memberId, setMemberId] = useState(initial?.member_id ?? '');
  const [allDay, setAllDay] = useState(initial?.all_day ?? true);
  const [sd, setSd] = useState(initial?.start_date ?? date);
  const [ed, setEd] = useState(initial?.end_date ?? date);
  const [st, setSt] = useState(initial?.start_time ?? '09:00');
  const [et, setEt] = useState(initial?.end_time ?? '10:00');
  const [reason, setReason] = useState<Reason>(initial?.reason ?? '휴가');
  const [note, setNote] = useState(initial?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [mergeAsk, setMergeAsk] = useState<string | null>(null);

  const payload = (merge: boolean) => ({
    member_id: memberId,
    all_day: allDay,
    start_date: singleDay ? date : sd,
    end_date: singleDay ? date : ed,
    start_time: allDay ? '08:00' : st,
    end_time: allDay ? '17:00' : et,
    reason,
    note: note || null,
    merge,
  });

  const submit = async (merge = false) => {
    if (!memberId) return toast('사람을 골라 주세요', 'error');
    const p = payload(merge);
    if (!allDay && p.start_date === p.end_date && timeToMin(p.end_time) <= timeToMin(p.start_time)) return toast('종료 시각이 시작보다 뒤여야 해요', 'error');
    setBusy(true);
    try {
      if (initial) await api(`/api/b/${code}/absences/${initial.id}`, { method: 'PUT', body: p });
      else await api(`/api/b/${code}/absences`, { body: p });
      toast(merge ? '겹치는 부재를 하나로 합쳤어요' : '부재를 저장했어요');
      setMergeAsk(null);
      if (!initial) {
        setMemberId('');
        setNote('');
      }
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'overlap') setMergeAsk(e.message);
      else toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">누가</label>
        <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">사람 선택</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">언제</label>
        <div className="seg w-full">
          <button type="button" data-on={allDay} className="flex-1 justify-center" onClick={() => setAllDay(true)}>
            종일
          </button>
          <button type="button" data-on={!allDay} className="flex-1 justify-center" onClick={() => setAllDay(false)}>
            시간 지정 (30분 단위)
          </button>
        </div>
      </div>
      {!singleDay && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">시작 날짜</label>
            <input type="date" className="input" value={sd} onChange={(e) => (setSd(e.target.value), e.target.value > ed && setEd(e.target.value))} />
          </div>
          <div>
            <label className="label">종료 날짜</label>
            <input type="date" className="input" value={ed} min={sd} onChange={(e) => setEd(e.target.value)} />
          </div>
        </div>
      )}
      {!allDay && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div>
            <label className="label">시작 시각</label>
            <select className="input" value={st} onChange={(e) => setSt(e.target.value)}>
              {HALF_HOURS.slice(0, -1).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <span className="pb-2.5 text-slate-400">–</span>
          <div>
            <label className="label">종료 시각</label>
            <select className="input" value={et} onChange={(e) => setEt(e.target.value)}>
              {HALF_HOURS.slice(1).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div>
        <label className="label">사유</label>
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setReason(r)}
              className={`chip !h-8 border !px-3 transition ${reason === r ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200'}`}
            >
              {REASON_ICON[r]} {r}
            </button>
          ))}
        </div>
      </div>
      <input className="input" placeholder="메모 (선택)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" className="btn btn-ghost flex-1" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={() => submit(false)}>
          {initial ? '수정 저장' : '+ 부재 추가'}
        </button>
      </div>
      <ConfirmModal
        open={!!mergeAsk}
        title="부재 시간이 겹쳐요"
        message={mergeAsk}
        confirmText="하나로 합치기"
        onCancel={() => setMergeAsk(null)}
        onConfirm={() => submit(true)}
      />
    </div>
  );
}
