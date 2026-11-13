'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { GRADE_LABEL, GRADES, isTech, ROLE_LABEL, ROLES, type Grade, type Member, type Role } from '@/lib/types';
import { GradeBadge, Toggle } from '@/components/bits';
import { ImportPanel } from '@/components/ImportPanel';
import { useToast } from '@/components/Toast';

export default function MembersPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const toast = useToast();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [draft, setDraft] = useState({ name: '', grade: 'junior' as Grade, role: 'member' as Role });

  const load = useCallback(() => api<{ members: Member[] }>(`/api/b/${code}/members`).then((r) => setMembers(r.members)), [code]);
  useEffect(() => {
    load().catch((e) => toast(e.message, 'error'));
  }, [load, toast]);

  const patch = async (id: string, p: Partial<Member>, msg = '저장했어요') => {
    try {
      await api(`/api/b/${code}/members/${id}`, { method: 'PATCH', body: p });
      await load();
      toast(msg);
    } catch (e) {
      toast((e as Error).message, 'error');
      load();
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const max = Math.max(0, ...(members ?? []).map((m) => m.sort_order).filter((n) => n < 999));
    try {
      await api(`/api/b/${code}/members`, { body: { ...draft, sort_order: max + 1, active: true } });
      setDraft({ ...draft, name: '' });
      await load();
      toast(`${draft.name} 님을 추가했어요`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const active = (members ?? []).filter((m) => m.active);
  const list = (members ?? []).filter((m) => showInactive || m.active);

  const move = async (idx: number, dir: -1 | 1) => {
    const a = active[idx];
    const b = active[idx + dir];
    if (!a || !b) return;
    const [oa, ob] = a.sort_order === b.sort_order ? [idx + 1 + dir, idx + 1] : [b.sort_order, a.sort_order];
    await Promise.all([
      api(`/api/b/${code}/members/${a.id}`, { method: 'PATCH', body: { sort_order: oa } }),
      api(`/api/b/${code}/members/${b.id}`, { method: 'PATCH', body: { sort_order: ob } }),
    ]);
    load();
  };

  const counts = GRADES.map((g) => [g, active.filter((m) => m.grade === g).length] as const);

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-600">팀원 관리</p>
          <h1 className="text-2xl font-extrabold">👥 팀원 {active.length}명</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {counts.map(([g, n]) => (
              <span key={g} className="chip bg-white text-slate-600 ring-1 ring-slate-200">
                {GRADE_LABEL[g]} <b>{n}</b>
              </span>
            ))}
            <span className="chip bg-brand-50 text-brand-700">기술자 {active.filter((m) => isTech(m.grade)).length}</span>
          </div>
        </div>
        <ImportPanel code={code} onApplied={load} />
      </div>

      <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[160px] flex-1">
          <label className="label">이름</label>
          <input className="input" placeholder="새 팀원 이름" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">등급</label>
          <select className="input" value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value as Grade })}>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {GRADE_LABEL[g]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">역할</label>
          <select className="input" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary">+ 추가</button>
      </form>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="text-sm font-semibold text-slate-500">표시 순서대로 배정표에 나와요</span>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <input type="checkbox" className="accent-brand-500" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            사용중지 포함
          </label>
        </div>
        {!members ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton h-10" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="w-20 py-2 pl-5">순서</th>
                <th>이름</th>
                <th>등급</th>
                <th>역할</th>
                <th className="pr-5 text-right">사용</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const ai = active.findIndex((x) => x.id === m.id);
                return (
                  <tr key={m.id} className={`border-t border-slate-100 ${m.active ? '' : 'opacity-50'}`}>
                    <td className="py-2 pl-5">
                      {m.active && (
                        <div className="flex items-center gap-0.5">
                          <button className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100" onClick={() => move(ai, -1)} disabled={ai === 0}>
                            ↑
                          </button>
                          <button className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100" onClick={() => move(ai, 1)} disabled={ai === active.length - 1}>
                            ↓
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        defaultValue={m.name}
                        className="w-32 rounded-lg border border-transparent bg-transparent px-2 py-1 font-semibold hover:border-slate-200 focus:border-brand-400 focus:bg-white focus:outline-none"
                        onBlur={(e) => e.target.value.trim() !== m.name && patch(m.id, { name: e.target.value.trim() }, '이름을 바꿨어요')}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <GradeBadge grade={m.grade} />
                        <select className="rounded-lg bg-transparent px-1 py-1 text-sm hover:bg-slate-50" value={m.grade} onChange={(e) => patch(m.id, { grade: e.target.value as Grade })}>
                          {GRADES.map((g) => (
                            <option key={g} value={g}>
                              {GRADE_LABEL[g]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <select className="rounded-lg bg-transparent px-1 py-1 text-sm hover:bg-slate-50" value={m.role} onChange={(e) => patch(m.id, { role: e.target.value as Role })}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="pr-5 text-right">
                      <Toggle on={m.active} onChange={(v) => patch(m.id, { active: v }, v ? '다시 사용해요' : '사용중지했어요 (과거 기록은 그대로)')} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-center text-xs text-slate-400">💡 구글 시트가 기본 입력 장소예요. 앱에서 고친 내용은 다음 불러오기 때 시트 내용으로 덮어써져요.</p>
    </main>
  );
}
