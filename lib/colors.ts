import type { Place } from './types';

/** 장소별 색 계열: A 파랑, B 초록, C 주황 */
export const PLACE_HUE: Record<Place, { h: number; s: number; label: string; solid: string }> = {
  A: { h: 214, s: 92, label: '파랑', solid: '#3b82f6' },
  B: { h: 146, s: 58, label: '초록', solid: '#10b981' },
  C: { h: 27, s: 95, label: '주황', solid: '#f97316' },
};

const LIGHTNESS = [84, 70, 78, 64, 88, 74, 67, 81, 72, 86];

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`.toUpperCase();
}

/** 그날 체크된 작업에 음영색 지정 — 같은 장소 안에서는 명도를 달리 */
export function assignColors(routines: { id: string; place: Place; routine_no: number }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of ['A', 'B', 'C'] as Place[]) {
    const list = routines.filter((r) => r.place === p).sort((a, b) => a.routine_no - b.routine_no);
    list.forEach((r, i) => {
      const { h, s } = PLACE_HUE[p];
      const hueShift = ((Math.floor(i / LIGHTNESS.length) % 3) - 1) * 8;
      out[r.id] = hslToHex(h + hueShift, s, LIGHTNESS[i % LIGHTNESS.length]);
    });
  }
  return out;
}
