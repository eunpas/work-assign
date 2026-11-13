import { store } from '@/lib/db';
import { FormatError, parseWorkbook } from '@/lib/excel/parse';
import { fetchSheetXlsx, SheetFetchError } from '@/lib/gsheet';
import { diffImport } from '@/lib/importer';
import { HttpError, requireAdmin, route, type CodeCtx } from '@/lib/server';

/** 양식 올리기(F21) 또는 구글 시트에서 불러오기(F22) → 미리보기 */
export const POST = route<CodeCtx>(async (req, { params }) => {
  const b = await requireAdmin((await params).code);
  let buf: Buffer;
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new HttpError(400, '파일을 골라 주세요');
    if (file.size > 5 * 1024 * 1024) throw new HttpError(400, '파일이 너무 커요 (5MB 이하)');
    buf = Buffer.from(await file.arrayBuffer());
  } else {
    if (!b.google_sheet_url) throw new HttpError(400, '먼저 구글 시트 링크를 등록해 주세요', 'no_sheet');
    try {
      buf = await fetchSheetXlsx(b.google_sheet_url);
    } catch (e) {
      if (e instanceof SheetFetchError) throw new HttpError(400, e.message, e.code);
      throw e;
    }
  }
  let parsed;
  try {
    parsed = await parseWorkbook(buf);
  } catch (e) {
    if (e instanceof FormatError) throw new HttpError(400, e.message, e.code);
    throw e;
  }
  const s = store();
  const [members, routines] = await Promise.all([s.listMembers(b.id), s.listRoutines(b.id)]);
  const payload = {
    members: parsed.members.map(({ row: _r, ...m }) => m),
    routines: parsed.routines.map(({ row: _r, ...r }) => r),
  };
  const { ops: _ops, ...preview } = diffImport(payload, { members, routines }, parsed.errors);
  return preview;
});
