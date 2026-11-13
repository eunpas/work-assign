'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';

export function LoginForm({ code }: { code: string }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await api(`/api/b/${code}/login`, { body: { password: pw } });
          router.replace(`/b/${code}/admin/plan`);
          router.refresh();
        } catch (e) {
          setErr((e as Error).message);
          setBusy(false);
        }
      }}
    >
      <input className="input !h-12 text-base" type="password" placeholder="관리자 비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus required />
      {err && <p className="text-sm font-medium text-rose-500">{err}</p>}
      <button className="btn btn-primary btn-lg w-full" disabled={busy}>
        {busy ? '확인 중…' : '로그인'}
      </button>
    </form>
  );
}
