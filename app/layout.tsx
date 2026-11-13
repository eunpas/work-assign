import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000';
const TITLE = '작업배정 — 오늘 작업, 3초 만에 배정';
const DESC = '정보통신 유지보수팀의 하루 작업을 자동으로 배정하고 링크와 엑셀로 공유해요';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, siteName: '작업배정', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🗓️</text></svg>" />
      </head>
      <body className="bg-mesh min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
