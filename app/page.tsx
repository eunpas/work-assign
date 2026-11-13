import Link from 'next/link';
import { store } from '@/lib/db';
import { DEMO } from '@/lib/seed-data';
import { Logo } from '@/components/bits';
import { CreateBranchForm } from './CreateBranchForm';

export const dynamic = 'force-dynamic';

const FEATURES = [
  { icon: '⚡', title: '체크하고 버튼 한 번', desc: '오늘 작업과 부재자만 고르면 몇 초 만에 규칙에 맞는 배정표가 나와요.' },
  { icon: '🧭', title: '이동은 최소로', desc: 'A·B·C 장소 이동 10분, 기술자 1명 이상, 점심·체육까지 알아서 계산해요.' },
  { icon: '🖱️', title: '칸 클릭으로 수정', desc: '드래그로 여러 칸을 한 번에. 규칙이 깨지면 빨갛게 알려줘요.' },
  { icon: '🔗', title: '링크로 바로 공유', desc: '팀원은 링크만 열면 내 일정 확인 끝. 엑셀 파일로도 내려받아요.' },
];

export default async function Home() {
  const demo = await store().getBranchByCode(DEMO.suwon.code);
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        {demo && (
          <Link href={`/b/${demo.code}`} className="btn btn-ghost btn-sm">
            데모 둘러보기 →
          </Link>
        )}
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <section>
          <span className="chip bg-white/80 text-brand-700 shadow-sm ring-1 ring-brand-100">🛠️ 정보통신 유지보수팀을 위한 배정 도구</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[56px]">
            오늘 작업 배정,
            <br />
            <span className="text-grad">3초면 끝.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-slate-600">
            매일 아침 손으로 수십 분 걸리던 작업 배정을 자동으로. 부재·장소 이동·기술자 규칙까지 한 번에 지키는 배정표를 만들고, 링크와 엑셀로 바로 공유하세요.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {demo ? (
              <Link href={`/b/${demo.code}/admin`} className="btn btn-primary btn-lg">
                가상 수원지사로 시작하기 ✨
              </Link>
            ) : null}
            <a href="#create" className="btn btn-ghost btn-lg">
              새 지사 만들기
            </a>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5 transition hover:-translate-y-0.5">
                <div className="text-2xl">{f.icon}</div>
                <p className="mt-2 font-bold">{f.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:sticky lg:top-8 lg:self-start">
          <MiniPreview />
          <div id="create" className="card mt-5 p-6">
            <h2 className="text-lg font-bold">🏢 새 지사 만들기</h2>
            <p className="mt-1 text-sm text-slate-500">지사 이름과 관리자 비밀번호만 있으면 돼요. 지사마다 데이터가 따로 관리돼요.</p>
            <CreateBranchForm />
          </div>
          {demo && (
            <p className="mt-4 text-center text-xs text-slate-400">
              데모 관리자 비밀번호: <b className="text-slate-600">{DEMO.suwon.password}</b> · 모든 데이터는 가상이에요
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function MiniPreview() {
  const rows = [
    ['김하준', ['#A9C8FD', '#A9C8FD', '#A9C8FD', null, '#9EE6BF', '#9EE6BF', '#9EE6BF', '#9EE6BF']],
    ['박도윤', ['#FFC79A', '#FFC79A', null, '#A9C8FD', '#A9C8FD', '#A9C8FD', null, null]],
    ['이서윤', ['#7FB0FC', '#7FB0FC', '#7FB0FC', '#7FB0FC', null, '#FFB37A', '#FFB37A', '#FFB37A']],
    ['신유찬', [null, 'off', 'off', 'off', 'off', '#9EE6BF', '#9EE6BF', null]],
  ] as const;
  return (
    <div className="card overflow-hidden p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold">📋 2026.11.13 (금)</span>
        <span className="chip bg-emerald-50 text-emerald-700">미배정 0 · 경고 0</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(([n, cells]) => (
          <div key={n} className="flex items-center gap-2">
            <span className="w-12 text-xs font-semibold text-slate-600">{n}</span>
            <div className="flex flex-1 gap-[3px]">
              {cells.map((c, i) => (
                <div key={i} className={`h-6 flex-1 rounded-md ${c === 'off' ? 'absent' : c ? '' : 'bg-slate-100'}`} style={c && c !== 'off' ? { background: c } : undefined} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <i className="size-2.5 rounded-full bg-blue-500" />A 파랑
        </span>
        <span className="flex items-center gap-1">
          <i className="size-2.5 rounded-full bg-emerald-500" />B 초록
        </span>
        <span className="flex items-center gap-1">
          <i className="size-2.5 rounded-full bg-orange-500" />C 주황
        </span>
      </div>
    </div>
  );
}
