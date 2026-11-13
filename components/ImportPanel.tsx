'use client';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError, download } from '@/lib/client';
import type { ImportPreview } from '@/lib/importer';
import { Modal } from './Modal';
import { useToast } from './Toast';

type Preview = Omit<ImportPreview, 'ops'>;

const KIND_STYLE = {
  add: ['추가', 'bg-emerald-50 text-emerald-700'],
  update: ['수정', 'bg-sky-50 text-sky-700'],
  deactivate: ['사용중지', 'bg-slate-100 text-slate-600'],
} as const;

/** 양식 내려받기·올리기 (F20·F21) + 구글 시트에서 불러오기 (F22) */
export function ImportPanel({ code, onApplied }: { code: string; onApplied: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ data: Preview; source: string } | null>(null);
  const [restricted, setRestricted] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    api<{ url: string | null }>(`/api/b/${code}/sheet`)
      .then((r) => setSheetUrl(r.url))
      .catch(() => {});
  }, [code]);

  const runPreview = async (src: File | 'google') => {
    setBusy(src === 'google' ? '구글 시트를 읽는 중…' : '파일을 읽는 중…');
    try {
      let data: Preview;
      if (src === 'google') data = await api<Preview>(`/api/b/${code}/import/preview`, { body: {} });
      else {
        const fd = new FormData();
        fd.append('file', src);
        data = await api<Preview>(`/api/b/${code}/import/preview`, { form: fd });
      }
      setPreview({ data, source: src === 'google' ? '구글 시트' : src.name });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'restricted') setRestricted(true);
      else if (e instanceof ApiError && e.code === 'no_sheet') setLinkOpen(true);
      else toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveLink = async () => {
    try {
      const r = await api<{ url: string | null }>(`/api/b/${code}/sheet`, { method: 'PUT', body: { url: linkDraft } });
      setSheetUrl(r.url);
      setLinkOpen(false);
      toast('구글 시트 링크를 저장했어요');
      if (r.url) runPreview('google');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const apply = async () => {
    if (!preview) return;
    setBusy('반영하는 중…');
    try {
      const r = await api<{ counts: Preview['counts'] }>(`/api/b/${code}/import/apply`, { body: { payload: preview.data.payload } });
      toast(`반영 완료 · 추가 ${r.counts.add} / 수정 ${r.counts.update} / 사용중지 ${r.counts.deactivate}`);
      setPreview(null);
      onApplied();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const c = preview?.data.counts;
  const noChange = c && c.add + c.update + c.deactivate === 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" disabled={!!busy} onClick={() => (sheetUrl ? runPreview('google') : (setLinkDraft(''), setLinkOpen(true)))}>
          <GSheetIcon /> 구글 시트에서 불러오기
        </button>
        {sheetUrl && (
          <button className="btn btn-ghost btn-sm" onClick={() => (setLinkDraft(sheetUrl), setLinkOpen(true))} title={sheetUrl}>
            🔗 링크 변경
          </button>
        )}
        <div className="relative">
          <button className="btn btn-ghost" onClick={() => setMenu((m) => !m)}>
            ⬇️ 양식 내려받기 ▾
          </button>
          {menu && (
            <div className="animate-pop absolute right-0 z-20 mt-1 w-52 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl" onMouseLeave={() => setMenu(false)}>
              <button className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => (setMenu(false), download(`/api/b/${code}/template`))}>
                📄 현재 데이터 채운 양식
              </button>
              <button className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => (setMenu(false), download(`/api/b/${code}/template?blank=1`))}>
                🗒️ 빈 양식
              </button>
            </div>
          )}
        </div>
        <button className="btn btn-ghost" disabled={!!busy} onClick={() => fileRef.current?.click()}>
          ⬆️ 양식 올리기
        </button>
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && runPreview(e.target.files[0])} />
        {busy && (
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <span className="size-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
            {busy}
          </span>
        )}
      </div>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="🔗 구글 시트 연결"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setLinkOpen(false)}>
              취소
            </button>
            <button className="btn btn-primary" onClick={saveLink}>
              저장하고 불러오기
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          입력 양식 구글 시트의 링크를 붙여넣으세요. 한 번 저장하면 다음부터는 버튼 하나로 불러와요. 공유는 <b>“링크가 있는 모든 사용자 → 뷰어”</b>여야 해요.
        </p>
        <input className="input mt-4" placeholder="https://docs.google.com/spreadsheets/d/…" value={linkDraft} onChange={(e) => setLinkDraft(e.target.value)} autoFocus />
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          🔒 링크 공개 공유는 링크를 아는 누구나 시트를 볼 수 있다는 뜻이에요. 가상 데이터 테스트에만 쓰고, 실제 인원 정보 전에는 서비스 계정 방식으로 바꾸세요.
        </p>
      </Modal>

      <Modal open={restricted} onClose={() => setRestricted(false)} title="🔒 구글 시트를 읽을 수 없어요">
        <p className="text-sm text-slate-600">시트 공유가 “제한됨”이라 앱이 읽을 수 없어요. 아래처럼 바꾼 뒤 다시 눌러 주세요.</p>
        <ol className="mt-4 space-y-3">
          {[
            ['1', '구글 시트 오른쪽 위 [공유] 버튼을 눌러요'],
            ['2', '“일반 액세스”에서 제한됨 → 링크가 있는 모든 사용자'],
            ['3', '역할은 “뷰어”로 두고 [완료]'],
          ].map(([n, t]) => (
            <li key={n} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">{n}</span>
              {t}
            </li>
          ))}
        </ol>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4">
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
            <span className="text-sm">🌐 링크가 있는 모든 사용자</span>
            <span className="chip bg-brand-50 text-brand-700">뷰어 ▾</span>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="미리보기"
        width="max-w-2xl"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>
              닫기
            </button>
            <button className="btn btn-primary" onClick={apply} disabled={!!busy || !!c?.error || !!noChange}>
              {c?.error ? '오류를 고쳐야 반영할 수 있어요' : noChange ? '바뀐 내용이 없어요' : '✅ 반영'}
            </button>
          </>
        }
      >
        {preview && c && (
          <>
            <p className="text-xs text-slate-500">출처: {preview.source}</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(
                [
                  ['추가', c.add, 'text-emerald-600'],
                  ['수정', c.update, 'text-sky-600'],
                  ['사용중지', c.deactivate, 'text-slate-600'],
                  ['오류', c.error, 'text-rose-600'],
                ] as const
              ).map(([l, n, cls]) => (
                <div key={l} className="rounded-2xl bg-slate-50 p-3 text-center">
                  <div className={`text-2xl font-extrabold tabular-nums ${cls}`}>{n}</div>
                  <div className="text-xs font-semibold text-slate-500">{l}</div>
                </div>
              ))}
            </div>
            {preview.data.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-bold text-rose-600">오류가 있어 아무것도 반영하지 않았어요</p>
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400">
                      <th className="py-1">시트</th>
                      <th>줄</th>
                      <th>이유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.errors.map((e, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-1.5">{e.sheet}</td>
                        <td className="tabular-nums">{e.row}줄</td>
                        <td className="text-rose-600">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {preview.data.items.length > 0 && (
              <ul className="mt-4 space-y-1">
                {preview.data.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50">
                    <span className={`chip !h-5 !px-1.5 !text-[10px] ${KIND_STYLE[it.kind][1]}`}>{KIND_STYLE[it.kind][0]}</span>
                    <span className="text-xs text-slate-400">{it.sheet}</span>
                    <b className="font-semibold">{it.label}</b>
                    {it.detail && <span className="text-xs text-slate-500">{it.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-slate-400">양식에서 지운 줄은 바뀌지 않아요. 그만 쓸 항목은 사용여부를 N으로 바꾸세요.</p>
          </>
        )}
      </Modal>
    </>
  );
}

function GSheetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-6 10h3v2H8v-2zm0 4h3v2H8v-2zm5 2v-2h3v2h-3zm3-4h-3v-2h3v2zm-2-4V3.5L18.5 8H14z" />
    </svg>
  );
}
