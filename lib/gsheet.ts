/** 구글 시트에서 불러오기 (F22) — 공개 링크의 xlsx 내보내기 주소 사용 */

export function extractSheetId(url: string): string | null {
  const m = url.trim().match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : null;
}

export class SheetFetchError extends Error {
  constructor(
    message: string,
    public code: 'not_sheet' | 'restricted' | 'network',
  ) {
    super(message);
  }
}

export async function fetchSheetXlsx(url: string): Promise<Buffer> {
  const id = extractSheetId(url);
  if (!id) throw new SheetFetchError('docs.google.com/spreadsheets/… 로 시작하는 링크를 넣어주세요', 'not_sheet');
  let res: Response;
  try {
    res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, { redirect: 'follow', cache: 'no-store' });
  } catch {
    throw new SheetFetchError('구글 시트에 연결하지 못했어요. 잠시 후 다시 시도해 주세요', 'network');
  }
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || type.includes('text/html')) {
    if (res.status >= 500) throw new SheetFetchError('구글 시트 서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요', 'network');
    throw new SheetFetchError("구글 시트 공유를 '링크가 있는 모든 사용자 → 뷰어'로 바꿔주세요", 'restricted');
  }
  return Buffer.from(await res.arrayBuffer());
}
