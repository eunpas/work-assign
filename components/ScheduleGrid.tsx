'use client';
import { memo } from 'react';
import { breakOf, SLOT_COUNT } from '@/lib/time';
import { fmtNo, type Grade, type Role } from '@/lib/types';
import { GradeBadge, RoleBadge } from './bits';

export interface GridMember {
  id: string;
  name: string;
  grade: Grade;
  role: Role;
}
export interface GridRoutine {
  id: string;
  routine_no: number;
  name: string;
  place: string;
  color: string;
}

interface Props {
  members: GridMember[];
  grid: Record<string, (string | null)[]>;
  routines: Record<string, GridRoutine>;
  blocked: Record<string, (string | null)[]>;
  editable?: boolean;
  selected?: Set<string>;
  warn?: Set<string>;
  highlight?: string | null;
  focusRoutine?: string | null;
  onCellDown?: (mi: number, s: number, e: React.MouseEvent) => void;
  onCellEnter?: (mi: number, s: number) => void;
  onNameClick?: (id: string) => void;
}

const HOURS = Array.from({ length: 9 }, (_, i) => i);
const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => i);

function ScheduleGridImpl({ members, grid, routines, blocked, editable, selected, warn, highlight, focusRoutine, onCellDown, onCellEnter, onNameClick }: Props) {
  return (
    <div className="scroll-thin overflow-x-auto rounded-2xl border border-slate-200/70 bg-white">
      <table className="border-separate border-spacing-0 text-xs" style={{ minWidth: 150 + SLOT_COUNT * 27 }}>
        <thead>
          <tr>
            <th rowSpan={2} className="sticky left-0 z-20 w-[150px] min-w-[150px] border-b border-r border-slate-200 bg-white px-3 text-left text-[11px] font-semibold text-slate-400">
              이름 · 등급
            </th>
            {HOURS.map((h) => (
              <th
                key={h}
                colSpan={6}
                className={`h-8 border-b border-l border-slate-200 px-1.5 text-left text-[11px] font-bold ${h === 4 || h === 8 ? 'text-slate-400' : 'text-slate-600'}`}
              >
                {String(8 + h).padStart(2, '0')}:00
                {h === 4 && <span className="ml-1 font-medium">🍱 점심</span>}
                {h === 8 && <span className="ml-1 font-medium">🏃 체육</span>}
              </th>
            ))}
          </tr>
          <tr>
            {SLOTS.map((s) => (
              <th key={s} className={`h-5 w-[27px] min-w-[27px] border-b border-slate-200 text-[9px] font-medium text-slate-300 ${s % 6 === 0 ? 'border-l' : ''}`}>
                {String((s % 6) * 10).padStart(2, '0')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((m, mi) => {
            const row = grid[m.id] ?? [];
            const bl = blocked[m.id] ?? [];
            const isHi = highlight === m.id;
            const dim = highlight && !isHi;
            return (
              <tr key={m.id} className={dim ? 'opacity-35' : ''}>
                <td
                  className={`sticky left-0 z-10 border-b border-r border-slate-100 px-3 ${isHi ? 'bg-brand-50' : 'bg-white'} ${onNameClick ? 'cursor-pointer hover:bg-brand-50' : ''}`}
                  onClick={() => onNameClick?.(m.id)}
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-[13px] font-semibold">{m.name}</span>
                    <GradeBadge grade={m.grade} />
                    <RoleBadge role={m.role} />
                  </div>
                </td>
                {SLOTS.map((s) => {
                  const br = breakOf(s);
                  const reason = bl[s];
                  const rid = row[s];
                  const r = rid ? routines[rid] : undefined;
                  const k = `${m.id}:${s}`;
                  const sel = selected?.has(k);
                  const w = warn?.has(k);
                  const prev = s > 0 && row[s - 1] === rid;
                  const next = s < SLOT_COUNT - 1 && row[s + 1] === rid;
                  const clickable = editable && !br && !reason;
                  const faded = focusRoutine && rid !== focusRoutine;
                  return (
                    <td
                      key={s}
                      className={`h-9 border-b border-slate-100 p-0 ${s % 6 === 0 ? 'border-l border-l-slate-200' : ''} ${br ? 'stripes' : reason && !r ? 'absent' : ''} ${clickable ? 'cursor-pointer' : ''}`}
                      onMouseDown={clickable ? (e) => onCellDown?.(mi, s, e) : undefined}
                      onMouseEnter={clickable ? () => onCellEnter?.(mi, s) : undefined}
                      title={r ? `${fmtNo(r.routine_no)} ${r.name} (${r.place})` : reason ? `부재 · ${reason}` : br ?? undefined}
                    >
                      <div className="relative h-full py-[3px]">
                        {r ? (
                          <div
                            className={`flex h-full items-center justify-center text-[10px] font-bold tabular-nums text-slate-800 transition-opacity ${prev ? '' : 'ml-[2px] rounded-l-md'} ${next ? '' : 'mr-[2px] rounded-r-md'} ${faded ? 'opacity-25' : ''}`}
                            style={{ background: r.color }}
                          >
                            <span className={prev ? 'opacity-45' : ''}>{fmtNo(r.routine_no)}</span>
                          </div>
                        ) : reason && !br ? (
                          <div className="flex h-full items-center justify-center text-[10px] font-semibold text-slate-400">{reason.slice(0, 1)}</div>
                        ) : clickable ? (
                          <div className="h-full rounded-md hover:bg-brand-50" />
                        ) : null}
                        {sel && <div className="pointer-events-none absolute inset-[1px] rounded-md bg-brand-500/20 ring-2 ring-brand-500" />}
                        {w && !sel && <div className="pointer-events-none absolute inset-[1px] rounded-md ring-2 ring-rose-500 ring-offset-0" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const ScheduleGrid = memo(ScheduleGridImpl);
