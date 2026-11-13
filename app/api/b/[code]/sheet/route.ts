import { store } from '@/lib/db';
import { extractSheetId } from '@/lib/gsheet';
import { body, HttpError, requireAdmin, route, type CodeCtx } from '@/lib/server';

export const GET = route<CodeCtx>(async (_req, { params }) => {
  const b = await requireAdmin((await params).code);
  return { url: b.google_sheet_url };
});

/** 구글 시트 링크 등록·변경 (F22) */
export const PUT = route<CodeCtx>(async (req, { params }) => {
  const b = await requireAdmin((await params).code);
  const { url } = await body<{ url?: string }>(req);
  const u = String(url ?? '').trim();
  if (u && !extractSheetId(u)) throw new HttpError(400, 'docs.google.com/spreadsheets/… 로 시작하는 링크를 넣어주세요', 'not_sheet');
  await store().updateBranch(b.id, { google_sheet_url: u || null });
  return { url: u || null };
});
