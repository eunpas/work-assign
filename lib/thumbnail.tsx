import { ImageResponse } from 'next/og';

/** 작업배정 썸네일 — 크기만 바꿔 여러 비율로 그릴 수 있게 1200px 기준으로 비례 확대 */

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
  ['#A9C8FD', '#A9C8FD', 0, '#FFB37A', '#FFB37A', '#FFB37A', 0, '#9EE6BF', '#9EE6BF', '#9EE6BF'],
];
const NAMES = ['김하준', '박도윤', '이서윤', '신유찬', '강서연', '조예준'];
const NOS = ['022', '012', '054', '030', '036', '049'];

export async function renderThumbnail(width: number, height: number) {
  const [bold, extra, medium] = await Promise.all([font('Bold'), font('ExtraBold'), font('Medium')]);
  const s = width / 1200;
  const px = (n: number) => Math.round(n * s);
  const tall = height / width > 0.55; // 16:10 처럼 세로가 넉넉하면 행을 더 보여준다
  const rows = tall ? ROWS : ROWS.slice(0, 5);

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
        <div style={{ position: 'absolute', top: px(-180), left: px(-120), width: px(560), height: px(560), borderRadius: 9999, background: 'rgba(255,255,255,0.16)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: px(-220), right: px(260), width: px(500), height: px(500), borderRadius: 9999, background: 'rgba(255,140,190,0.25)', display: 'flex' }} />

        {/* 왼쪽: 문구 */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: px(72), width: px(600) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: px(16) }}>
            <div
              style={{
                width: px(64),
                height: px(64),
                borderRadius: px(18),
                background: 'rgba(255,255,255,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(40,20,120,0.35)',
              }}
            >
              <svg width={px(36)} height={px(36)} viewBox="0 0 24 24" fill="none" stroke="#5a3ff0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="3" />
                <path d="M3 9h18M8 2v4M16 2v4M8 14l2.5 2.5L16 12" />
              </svg>
            </div>
            <div style={{ fontSize: px(40), fontWeight: 800, color: 'white', letterSpacing: -1 }}>작업배정</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: px(40), fontSize: px(76), fontWeight: 800, color: 'white', lineHeight: 1.12, letterSpacing: px(-3) }}>
            <span>오늘 작업 배정,</span>
            <span style={{ color: '#FFF3B0' }}>3초면 끝.</span>
          </div>

          <div style={{ marginTop: px(26), fontSize: px(26), fontWeight: 500, color: 'rgba(255,255,255,0.9)', lineHeight: 1.45, display: 'flex' }}>
            부재·장소 이동·기술자 규칙까지 지키는 자동 배정표
          </div>

          <div style={{ display: 'flex', gap: px(10), marginTop: px(30) }}>
            {['⚡ 자동 배정', '🔗 링크 공유', '📊 엑셀 저장'].map((t) => (
              <div
                key={t}
                style={{
                  display: 'flex',
                  padding: `${px(10)}px ${px(18)}px`,
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.18)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  color: 'white',
                  fontSize: px(22),
                  fontWeight: 700,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 배정표 카드 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, paddingRight: px(56) }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: px(500),
              padding: px(28),
              borderRadius: px(32),
              background: 'rgba(255,255,255,0.96)',
              boxShadow: '0 30px 60px rgba(30,15,100,0.35)',
              transform: 'rotate(-2deg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: px(22), fontWeight: 800, color: '#17142b' }}>📋 2026.11.13 (금)</div>
              <div style={{ display: 'flex', padding: `${px(6)}px ${px(12)}px`, borderRadius: 9999, background: '#ECFDF5', color: '#047857', fontSize: px(16), fontWeight: 700 }}>
                미배정 0 · 경고 0
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: px(9), marginTop: px(20) }}>
              {rows.map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(10) }}>
                  <div style={{ display: 'flex', width: px(62), fontSize: px(17), fontWeight: 700, color: '#4b4766' }}>{NAMES[i]}</div>
                  <div style={{ display: 'flex', flex: 1, gap: px(3) }}>
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
                            height: px(34),
                            borderRadius: px(7),
                            fontSize: px(12),
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

            <div style={{ display: 'flex', gap: px(18), marginTop: px(20), fontSize: px(16), fontWeight: 600, color: '#6b6888' }}>
              {[
                ['#3b82f6', 'A 파랑'],
                ['#10b981', 'B 초록'],
                ['#f97316', 'C 주황'],
              ].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: px(6) }}>
                  <div style={{ display: 'flex', width: px(12), height: px(12), borderRadius: 9999, background: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [
        { name: 'Pretendard', data: medium, weight: 500, style: 'normal' },
        { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
        { name: 'Pretendard', data: extra, weight: 800, style: 'normal' },
      ],
    },
  );
}
