import { notFound, redirect } from 'next/navigation';
import { store } from '@/lib/db';
import { isAdminFor } from '@/lib/auth';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function SecureLayout({ children, params }: { children: React.ReactNode; params: Promise<{ code: string }> }) {
  const { code } = await params;
  const b = await store().getBranchByCode(code);
  if (!b) notFound();
  if (!(await isAdminFor(b))) redirect(`/b/${code}/admin`);
  return (
    <div className="min-h-screen">
      <AdminNav code={code} branchName={b.name} localMode={store().kind === 'local'} />
      {children}
    </div>
  );
}
