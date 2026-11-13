import { renderThumbnail } from '@/lib/thumbnail';

/** 링크 미리보기 썸네일 (카카오톡·슬랙 등에 링크를 붙이면 보이는 이미지) */
export const alt = '작업배정 — 오늘 작업 배정, 3초면 끝';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return renderThumbnail(size.width, size.height);
}
