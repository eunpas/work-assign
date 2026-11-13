import { renderThumbnail } from '@/lib/thumbnail';

/** 원하는 크기의 썸네일 PNG (예: /api/thumbnail?w=1600&h=1000 → 16:10) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const w = Math.min(3840, Math.max(600, Number(url.searchParams.get('w')) || 1600));
  const h = Math.min(2400, Math.max(315, Number(url.searchParams.get('h')) || 1000));
  return renderThumbnail(w, h);
}
