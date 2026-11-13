import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="card max-w-md p-10 text-center">
        <div className="text-5xl">🧭</div>
        <h1 className="mt-4 text-xl font-bold">페이지를 찾을 수 없어요</h1>
        <p className="mt-2 text-sm text-slate-500">지사 링크가 정확한지 확인해 주세요.</p>
        <Link href="/" className="btn btn-primary mt-6">
          첫 화면으로
        </Link>
      </div>
    </div>
  );
}
