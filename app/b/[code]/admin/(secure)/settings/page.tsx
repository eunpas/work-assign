'use client';
import { use, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/Toast';

export default function SettingsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field: string; msg: string } | null>(null);
  const [done, setDone] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => setLink(`${location.origin}/b/${code}`), [code]);

  const rules = [
    { ok: next.length >= 8, label: '8자 이상' },
    { ok: /[A-Za-z]/.test(next) && /\d/.test(next), label: '영문 + 숫자' },
    { ok: !!next && next !== current, label: '지금과 다른 비밀번호' },
    { ok: !!next && next === confirm, label: '확인 칸과 일치' },
  ];
  const valid = !!current && rules.every((r) => r.ok);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/b/${code}/password`, { method: 'PUT', body: { current, next } });
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
      toast('관리자 비밀번호를 바꿨어요');
    } catch (e) {
      const ex = e as Error & { code?: string };
      setErr({ field: ex.code ?? '', msg: ex.message });
    } finally {
      setBusy(false);
    }
  };

  const type = show ? 'text' : 'password';

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-6 py-6">
      <div>
        <p className="text-sm font-semibold text-brand-600">설정</p>
        <h1 className="text-2xl font-extrabold">⚙️ 지사 설정</h1>
      </div>

      <section className="card p-6">
        <h2 className="text-lg font-bold">🔑 관리자 비밀번호 변경</h2>
        <p className="mt-1 text-sm text-slate-500">팀장·부팀장이 함께 쓰는 비밀번호예요. 바꾸면 다른 기기의 관리자 로그인은 모두 풀리고, 지금 이 화면만 로그인 상태로 남아요.</p>

        {done && (
          <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✅ 비밀번호를 바꿨어요. 함께 쓰는 분(부팀장 등)에게 새 비밀번호를 따로 알려 주세요.
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="label">현재 비밀번호</label>
            <input
              className={`input ${err?.field === 'current' ? '!border-rose-400' : ''}`}
              type={type}
              autoComplete="current-password"
              value={current}
              onChange={(e) => (setCurrent(e.target.value), setDone(false))}
              required
            />
            {err?.field === 'current' && <p className="mt-1 text-xs font-medium text-rose-500">{err.msg}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">새 비밀번호</label>
              <input
                className={`input ${err?.field === 'next' ? '!border-rose-400' : ''}`}
                type={type}
                autoComplete="new-password"
                value={next}
                onChange={(e) => (setNext(e.target.value), setDone(false))}
                required
              />
            </div>
            <div>
              <label className="label">새 비밀번호 확인</label>
              <input className="input" type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>
          {err && err.field !== 'current' && <p className="text-xs font-medium text-rose-500">{err.msg}</p>}

          <ul className="flex flex-wrap gap-1.5">
            {rules.map((r) => (
              <li key={r.label} className={`chip transition ${r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {r.ok ? '✓' : '·'} {r.label}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-500">
              <input type="checkbox" className="accent-brand-500" checked={show} onChange={(e) => setShow(e.target.checked)} />
              비밀번호 보이기
            </label>
            <button className="btn btn-primary" disabled={!valid || busy}>
              {busy ? '바꾸는 중…' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold">🔗 팀원 공유 링크</h2>
        <p className="mt-1 text-sm text-slate-500">이 링크만 있으면 누구나 배정표를 볼 수 있어요. 팀 밖으로 퍼지지 않게 주의하세요.</p>
        <div className="mt-3 flex gap-2">
          <input className="input font-mono text-xs" readOnly value={link} onFocus={(e) => e.target.select()} />
          <button
            className="btn btn-ghost"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast('링크를 복사했어요');
            }}
          >
            복사
          </button>
        </div>
      </section>
    </main>
  );
}
