import { ImageResponse } from 'next/og';

/** 링크 미리보기 썸네일 (카카오톡·슬랙 등에 링크를 붙이면 보이는 이미지) */
export const alt = '작업배정 — 오늘 작업 배정, 3초면 끝';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const FONT = (w: string) => `https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-${w}.otf`;

async function font(w: string) {
  const res = await fetch(FONT(w));
  if (!res.ok) throw new Error(`font ${w} ${res.status}`);
  return res.arrayBuffer();
}

// 미니 배정표: 장소 색 계열 A 파랑 / B 초록 / C 주황, 0 = 빈칸, x = 부재
const ROWS: (string | 0)[][] = [
  ['#A9C8FD', '#A9C8FD', '#A9C8FD', '#7FB0FC', '#7FB0FC', 0, '#9EE6BF', '#9EE6BF', '#9EE6BF', '#9EE6BF'],
  ['#FFC79A', '#FFC79A', 0, '#A9C8FD', '#A9C8FD', '#A9C8FD', '#A9C8FD', 0, '#FFB37A', '#FFB37A'],
  ['#7FB0FC', '#7FB0FC', '#7FB0FC', '#7FB0FC', 0, '#FFB37A', '#FFB37A', '#FFB37A', '#FFB37A', 0],
  [0, 'x', 'x', 'x', 'x', '#9EE6BF', '#9EE6BF', '#6FD9A0', '#6FD9A0', '#6FD9A0'],
  ['#FFC79A', '#FFC79A', '#FFC79A', 0, '#9EE6BF', '#9EE6BF', '#9EE6BF', 0, '#A9C8FD', '#A9C8FD'],
];
const NAMES = ['김하준', '박도윤', '이서윤', '신유찬', '강서연'];
const NOS = ['022', '012', '054', '030', '036'];

export default async function Image() {
  const [bold, extra, medium] = await Promise.all([font('Bold'), font('ExtraBold'), font('Medium')]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #7c5cff 0%, #5b6cff 45%, #22b8ff 100%)',
          fontFamily: 'Pretendard',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 배경 빛 */}
        <div style={{ position: 'absolute', top: -180, left: -120, width: 520, height: 520, borderRadius: 999, background: 'rgba(255,255,255,0.16)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -220, right: 260, width: 460, height: 460, borderRadius: 999, background: 'rgba(255,140,190,0.25)', display: 'flex' }} />

        {/* 왼쪽: 문구 */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 0 72px', width: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(40,20,120,0.35)',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5a3ff0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="3" />
                <path d="M3 9h18M8 2v4M16 2v4M8 14l2.5 2.5L16 12" />
              </svg>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: 'white', letterSpacing: -1 }}>작업배정</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40, fontSize: 76, fontWeight: 800, color: 'white', lineHeight: 1.12, letterSpacing: -3 }}>
            <span>오늘 작업 배정,</span>
            <span style={{ color: '#FFF3B0' }}>3초면 끝.</span>
          </div>

          <div style={{ marginTop: 26, fontSize: 26, fontWeight: 500, color: 'rgba(255,255,255,0.9)', lineHeight: 1.45, display: 'flex' }}>
            부재·장소 이동·기술자 규칙까지 지키는 자동 배정표
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
            {['⚡ 자동 배정', '🔗 링크 공유', '📊 엑셀 저장'].map((t) => (
              <div
                key={t}
                style={{
                  display: 'flex',
                  padding: '10px 18px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.18)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  color: 'white',
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 배정표 카드 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, paddingRight: 56 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 500,
              padding: 28,
              borderRadius: 32,
              background: 'rgba(255,255,255,0.96)',
              boxShadow: '0 30px 60px rgba(30,15,100,0.35)',
              transform: 'rotate(-2deg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, color: '#17142b' }}>📋 2026.11.13 (금)</div>
              <div style={{ display: 'flex', padding: '6px 12px', borderRadius: 999, background: '#ECFDF5', color: '#047857', fontSize: 16, fontWeight: 700 }}>
                미배정 0 · 경고 0
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 20 }}>
              {ROWS.map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', width: 62, fontSize: 17, fontWeight: 700, color: '#4b4766' }}>{NAMES[i]}</div>
                  <div style={{ display: 'flex', flex: 1, gap: 3 }}>
                    {row.map((c, j) => {
                      const first = c && c !== 'x' && row[j - 1] !== c;
                      return (
                        <div
                          key={j}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            height: 34,
                            borderRadius: 7,
                            fontSize: 12,
                            fontWeight: 800,
                            color: '#1f2937',
                            background: c === 'x' ? '#E2E0EA' : c ? c : '#F1F0F7',
                          }}
                        >
                          {c === 'x' ? (j === 1 ? '휴' : '') : first ? NOS[(i + j) % NOS.length] : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 18, marginTop: 20, fontSize: 16, fontWeight: 600, color: '#6b6888' }}>
              {[
                ['#3b82f6', 'A 파랑'],
                ['#10b981', 'B 초록'],
                ['#f97316', 'C 주황'],
              ].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 99, background: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: medium, weight: 500, style: 'normal' },
        { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
        { name: 'Pretendard', data: extra, weight: 800, style: 'normal' },
      ],
    },
  );
}
