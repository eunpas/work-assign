import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { store } from '@/lib/db';
import { isAdminFor } from '@/lib/auth';
import { Logo } from '@/components/bits';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLogin({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const b = await store().getBranchByCode(code);
  if (!b) notFound();
  if (await isAdminFor(b)) redirect(`/b/${code}/admin/plan`);
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo href={`/b/${code}`} />
        </div>
        <div className="card p-7">
          <div className="mb-1 text-3xl">🔐</div>
          <h1 className="text-xl font-extrabold">관리자 로그인</h1>
          <p className="mt-1 text-sm text-slate-500">
            <b className="text-slate-700">{b.name}</b> 팀장·부팀장용이에요. 로그인은 12시간 유지돼요.
          </p>
          <LoginForm code={code} />
        </div>
        <p className="mt-5 text-center text-sm">
          <Link href={`/b/${code}`} className="text-slate-500 hover:text-brand-600">
            ← 배정표 보기로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
