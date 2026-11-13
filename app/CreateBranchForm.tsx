'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/Toast';

export function CreateBranchForm() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string; name: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return toast('비밀번호가 서로 달라요', 'error');
    setBusy(true);
    try {
      setDone(await api<{ code: string; name: string }>('/api/branches', { body: { name, password: pw } }));
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    const link = `${location.origin}/b/${done.code}`;
    return (
      <div className="mt-5 rounded-2xl bg-brand-50 p-4">
        <p className="font-bold">🎉 {done.name} 지사가 만들어졌어요</p>
        <p className="mt-1 text-xs text-slate-500">이 링크가 곧 열람 권한이에요. 팀 밖으로 퍼지지 않게 주의하세요.</p>
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
        <Link href={`/b/${done.code}/admin`} className="btn btn-primary mt-3 w-full">
          관리자 화면으로 →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div>
        <label className="label">지사 이름</label>
        <input className="input" placeholder="예: 테스트지사(가상)" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">관리자 비밀번호</label>
          <input className="input" type="password" placeholder="6자 이상" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
        </div>
        <div>
          <label className="label">한 번 더</label>
          <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} />
        </div>
      </div>
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? '만드는 중…' : '지사 링크 만들기'}
      </button>
    </form>
  );
}
