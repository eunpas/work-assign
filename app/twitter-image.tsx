import { renderThumbnail } from '@/lib/thumbnail';

export const alt = '작업배정 — 오늘 작업 배정, 3초면 끝';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderThumbnail(size.width, size.height);
}
