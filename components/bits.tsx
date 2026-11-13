'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PLACE_HUE } from '@/lib/colors';
import { addDays, prettyDate } from '@/lib/time';
import { GRADE_SHORT, ROLE_LABEL, type Grade, type Place, type Role } from '@/lib/types';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="grid size-8 place-items-center rounded-xl text-white shadow-lg shadow-brand-500/30" style={{ background: 'var(--grad)' }}>
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <path d="M3 9h18M8 2v4M16 2v4M8 14l2.5 2.5L16 12" />
        </svg>
      </span>
      <span className="text-[17px]">작업배정</span>
    </Link>
  );
}

const GRADE_STYLE: Record<Grade, string> = {
  special: 'bg-violet-100 text-violet-700',
  advanced: 'bg-indigo-100 text-indigo-700',
  intermediate: 'bg-sky-100 text-sky-700',
  junior: 'bg-teal-100 text-teal-700',
  assistant: 'bg-slate-100 text-slate-500',
};

export function GradeBadge({ grade, className = '' }: { grade: Grade; className?: string }) {
  return <span className={`chip !h-5 !px-1.5 !text-[10px] ${GRADE_STYLE[grade]} ${className}`}>{GRADE_SHORT[grade]}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  if (role === 'member') return null;
  return <span className="chip !h-5 !px-1.5 !text-[10px] bg-amber-100 text-amber-700">{ROLE_LABEL[role]}</span>;
}

export function PlaceBadge({ place }: { place: Place }) {
  return (
    <span className="chip !h-5 !px-1.5 !text-[10px] text-white" style={{ background: PLACE_HUE[place].solid }}>
      {place}
    </span>
  );
}

export function DateNav({ date, basePath, guard }: { date: string; basePath: string; guard?: () => boolean }) {
  const router = useRouter();
  const go = (d: string) => {
    if (guard && !guard()) return;
    router.push(`${basePath}?date=${d}`);
  };
  return (
    <div className="flex items-center gap-1.5">
      <button className="btn btn-ghost btn-sm !px-2" onClick={() => go(addDays(date, -1))} aria-label="이전 날">
        ◀
      </button>
      <label className="relative">
        <span className="btn btn-ghost btn-sm min-w-[148px] text-[13px]">📅 {prettyDate(date)}</span>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && go(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="날짜 선택"
        />
      </label>
      <button className="btn btn-ghost btn-sm !px-2" onClick={() => go(addDays(date, 1))} aria-label="다음 날">
        ▶
      </button>
    </div>
  );
}

export function Stat({ label, value, tone = 'slate' }: { label: string; value: React.ReactNode; tone?: 'slate' | 'red' | 'amber' | 'green' | 'brand' }) {
  const tones = {
    slate: 'bg-white text-slate-700 border-slate-200',
    red: 'bg-rose-50 text-rose-600 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {label} <b className="text-[13px] tabular-nums">{value}</b>
    </span>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${on ? 'bg-brand-500' : 'bg-slate-200'}`}
      aria-pressed={on}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow transition ${on ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function Empty({ icon, title, desc, children }: { icon: string; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="mb-1 grid size-16 place-items-center rounded-3xl bg-brand-50 text-3xl">{icon}</div>
      <p className="font-bold">{title}</p>
      {desc && <p className="max-w-sm text-sm text-slate-500">{desc}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
