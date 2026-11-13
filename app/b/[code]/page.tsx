import { notFound } from 'next/navigation';
import { store } from '@/lib/db';
import { isValidDate, todayKST } from '@/lib/time';
import { ViewClient } from './ViewClient';

export const dynamic = 'force-dynamic';

export default async function ViewPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ date?: string }> }) {
  const { code } = await params;
  const { date: d } = await searchParams;
  const b = await store().getBranchByCode(code);
  if (!b) notFound();
  const date = d && isValidDate(d) ? d : todayKST();
  return <ViewClient key={date} code={code} branchName={b.name} date={date} />;
}
