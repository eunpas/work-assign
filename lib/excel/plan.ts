/** 배정표 엑셀 (F10, 7.2) — 위: 배정표 / 아래: 범례표 / 미배정 목록 */
import ExcelJS from 'exceljs';
import { breakOf, prettyDate, SLOT_COUNT, slotToTime } from '../time';
import { GRADE_SHORT, fmtNo, type Member, type PlanRoutine } from '../types';
import { routineSpans, spanLabel, type Grid } from '../plan-utils';

const solid = (hex: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex.replace('#', '').toUpperCase() } });
const GRAY = '#D1D5DB';
const LIGHT = '#F3F4F6';
const border: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
  right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
};

export async function buildPlanXlsx(opts: {
  branchName: string;
  date: string;
  members: Member[];
  routines: PlanRoutine[];
  grid: Grid;
  blocked: Record<string, (string | null)[]>;
}): Promise<Buffer> {
  const { branchName, date, members, routines, grid, blocked } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = '작업배정';
  const ws = wb.addWorksheet('배정표', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
  });
  const C0 = 3; // 첫 시간 칸 열
  const LAST = C0 + SLOT_COUNT - 1;
  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 6;
  for (let i = 0; i < SLOT_COUNT; i++) ws.getColumn(C0 + i).width = 4.3;

  // 제목
  ws.mergeCells(1, 1, 1, LAST);
  const title = ws.getCell(1, 1);
  title.value = `작업배정표 · ${branchName} · ${prettyDate(date)}`;
  title.font = { bold: true, size: 15, color: { argb: 'FF312E81' } };
  title.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 26;

  // 시간 머리
  const hRow = 3;
  ws.getCell(hRow, 1).value = '이름';
  ws.getCell(hRow, 2).value = '등급';
  ws.mergeCells(hRow, 1, hRow + 1, 1);
  ws.mergeCells(hRow, 2, hRow + 1, 2);
  for (let h = 0; h < 9; h++) {
    const c = C0 + h * 6;
    ws.mergeCells(hRow, c, hRow, c + 5);
    const cell = ws.getCell(hRow, c);
    cell.value = `${String(8 + h).padStart(2, '0')}:00${h === 4 ? ' 점심' : h === 8 ? ' 체육' : ''}`;
  }
  for (let s = 0; s < SLOT_COUNT; s++) ws.getCell(hRow + 1, C0 + s).value = slotToTime(s).slice(3);
  for (const r of [hRow, hRow + 1])
    for (let c = 1; c <= LAST; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { bold: r === hRow, size: r === hRow ? 9 : 7, color: { argb: 'FF374151' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = solid(c >= C0 && breakOf(c - C0) ? GRAY : '#EEF2FF');
      cell.border = border;
    }

  const rmap = new Map(routines.map((r) => [r.routine_id, r]));
  members.forEach((m, i) => {
    const r = hRow + 2 + i;
    ws.getRow(r).height = 18;
    const n = ws.getCell(r, 1);
    n.value = m.name;
    n.font = { bold: true, size: 10 };
    const g = ws.getCell(r, 2);
    g.value = GRADE_SHORT[m.grade];
    g.font = { size: 9, color: { argb: 'FF6B7280' } };
    [n, g].forEach((c) => ((c.border = border), (c.alignment = { vertical: 'middle', horizontal: 'center' })));
    for (let s = 0; s < SLOT_COUNT; s++) {
      const cell = ws.getCell(r, C0 + s);
      cell.border = border;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { size: 7, bold: true, color: { argb: 'FF1F2937' } };
      const br = breakOf(s);
      const bl = blocked[m.id]?.[s];
      const rid = grid[m.id]?.[s];
      const rt = rid ? rmap.get(rid) : undefined;
      if (rt) {
        cell.value = fmtNo(rt.routine_no);
        cell.fill = solid(rt.color);
      } else if (br) {
        cell.fill = solid(GRAY);
      } else if (bl) {
        cell.fill = solid(GRAY);
        cell.value = bl.slice(0, 1);
        cell.font = { size: 7, color: { argb: 'FF4B5563' } };
      }
    }
  });

  // 범례표
  let r = hRow + 2 + members.length + 2;
  ws.getCell(r, 1).value = '범례';
  ws.getCell(r, 1).font = { bold: true, size: 12, color: { argb: 'FF312E81' } };
  r++;
  const cols: [string, number, number][] = [
    ['번호', 1, 1],
    ['색', 2, 2],
    ['작업명', 3, 14],
    ['장소', 15, 17],
    ['작업시간', 18, 21],
    ['필요인원', 22, 25],
    ['시작–종료', 26, 33],
    ['배정된 사람', 34, LAST],
  ];
  const writeRow = (vals: (string | number)[], head: boolean, color?: string) => {
    cols.forEach(([, a, b], i) => {
      if (b > a) ws.mergeCells(r, a, r, b);
      const cell = ws.getCell(r, a);
      cell.value = vals[i];
      cell.alignment = { vertical: 'middle', horizontal: i === 2 || i === 7 ? 'left' : 'center', wrapText: true };
      cell.font = { bold: head, size: 9 };
      for (let c = a; c <= b; c++) {
        ws.getCell(r, c).border = border;
        if (head) ws.getCell(r, c).fill = solid('#EEF2FF');
      }
      if (i === 1 && color) cell.fill = solid(color);
    });
    ws.getRow(r).height = 18;
    r++;
  };
  writeRow(cols.map((c) => c[0]), true);
  const spans = routineSpans(grid);
  const name = new Map(members.map((m) => [m.id, m.name]));
  const sorted = [...routines].sort((a, b) => a.routine_no - b.routine_no);
  for (const rt of sorted) {
    const sp = spans[rt.routine_id];
    writeRow(
      [fmtNo(rt.routine_no), '', rt.name, rt.place, `${rt.duration_min}분`, `${rt.headcount}명`, sp ? spanLabel(sp) : '미배정', sp ? sp.members.map((id) => name.get(id) ?? '').join(', ') : ''],
      false,
      rt.color,
    );
  }

  const un = sorted.filter((rt) => !spans[rt.routine_id]);
  if (un.length) {
    r++;
    ws.getCell(r, 1).value = `미배정 작업 ${un.length}건`;
    ws.getCell(r, 1).font = { bold: true, size: 12, color: { argb: 'FFDC2626' } };
    r++;
    for (const rt of un) {
      ws.mergeCells(r, 1, r, LAST);
      const c = ws.getCell(r, 1);
      c.value = `${fmtNo(rt.routine_no)} ${rt.name} (${rt.place}, ${rt.duration_min}분, ${rt.headcount}명) — ${rt.unassigned_reason ?? '배정되지 않음'}`;
      c.font = { size: 9 };
      c.fill = solid(LIGHT);
      r++;
    }
  }
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: hRow + 1 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}
