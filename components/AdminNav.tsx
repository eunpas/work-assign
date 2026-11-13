'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { Logo } from './bits';

const TABS = [
  { href: 'plan', label: '배정하기', icon: '⚡' },
  { href: 'routines', label: '작업 루틴', icon: '🧰' },
  { href: 'members', label: '팀원', icon: '👥' },
  { href: 'absences', label: '부재', icon: '🌴' },
  { href: 'settings', label: '설정', icon: '⚙️' },
];

export function AdminNav({ code, branchName, localMode }: { code: string; branchName: string; localMode: boolean }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-2.5">
        <Logo href={`/b/${code}`} />
        <span className="hidden text-sm font-semibold text-slate-500 md:inline">{branchName}</span>
        {localMode && (
          <span className="chip hidden bg-amber-50 text-amber-700 lg:inline-flex" title="Supabase 환경변수가 없어 로컬 파일에 저장하고 있어요">
            로컬 저장 모드
          </span>
        )}
        <nav className="seg mx-auto">
          {TABS.map((t) => {
            const on = path?.includes(`/admin/${t.href}`);
            return (
              <Link key={t.href} href={`/b/${code}/admin/${t.href}`} data-on={on ? 'true' : 'false'} className="!px-4">
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link href={`/b/${code}`} className="btn btn-ghost btn-sm">
            👀 보기
          </Link>
          <button
            className="btn btn-sm text-slate-500 hover:bg-slate-100"
            onClick={async () => {
              await api(`/api/b/${code}/login`, { method: 'DELETE' });
              router.replace(`/b/${code}`);
              router.refresh();
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
