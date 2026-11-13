import { isValidDate, todayKST } from '@/lib/time';
import { PlanClient } from './PlanClient';

export default async function PlanPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ date?: string }> }) {
  const { code } = await params;
  const { date: d } = await searchParams;
  const date = d && isValidDate(d) ? d : todayKST();
  return <PlanClient key={date} code={code} date={date} />;
}
