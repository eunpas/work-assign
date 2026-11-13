/** 입력 양식 만들기 (F20) — 인원·작업루틴 시트 + 작성안내·요약 */
import ExcelJS from 'exceljs';
import { CYCLE_LABEL, CYCLES, GRADE_LABEL, GRADES, ROLE_LABEL, ROLES, type Member, type Routine } from '../types';

export const MEMBER_HEADERS = ['표시순서', '이름*', '등급*', '역할*', '사용여부', '기술자 여부(자동)', '메모'] as const;
export const ROUTINE_HEADERS = ['루틴번호*', '작업명*', '장소*', '작업시간(분)*', '필요인원(명)*', '주기*', '기준일', '사용여부', '메모'] as const;

const YELLOW = 'FFFFF7CC';
const HEAD = 'FF4F46E5';
const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
};

function header(ws: ExcelJS.Worksheet, headers: readonly string[], notes: Record<string, string>, widths: number[]) {
  ws.addRow([...headers]);
  const row = ws.getRow(1);
  row.height = 24;
  headers.forEach((h, i) => {
    const c = row.getCell(i + 1);
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = fill(HEAD);
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    if (notes[h]) c.note = notes[h];
    ws.getColumn(i + 1).width = widths[i];
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function list(ws: ExcelJS.Worksheet, col: string, rows: number, values: string[]) {
  for (let r = 2; r <= rows; r++)
    ws.getCell(`${col}${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${values.join(',')}"`],
      showErrorMessage: true,
      errorTitle: '목록에서 고르세요',
      error: `허용 값: ${values.join(', ')}`,
    };
}

function inputCells(ws: ExcelJS.Worksheet, cols: string[], rows: number) {
  for (let r = 2; r <= rows; r++)
    for (const c of cols) {
      const cell = ws.getCell(`${c}${r}`);
      cell.fill = fill(YELLOW);
      cell.border = thin;
    }
}

export async function buildTemplate(members: Member[], routines: Routine[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = '작업배정';

  // 작성안내
  const guide = wb.addWorksheet('작성안내', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  guide.getColumn(1).width = 100;
  [
    '작업배정 입력 양식',
    '',
    '• 노란 칸이 입력 칸입니다. 등급·역할·장소·시간·인원·주기·사용여부는 목록에서 고르세요.',
    '• 인원은 [이름], 작업루틴은 [루틴번호]로 찾아서 있으면 수정, 없으면 추가합니다.',
    '• 그만 쓸 항목은 줄을 지우지 말고 사용여부를 N으로 바꾸세요. (지운 줄은 바뀌지 않습니다)',
    '• 필수값(*)이 빠지거나 키가 중복되면 칸이 빨갛게 표시되고, 앱에서 반영되지 않습니다.',
    '• 기준일은 주기작업(일일 외)에 필수입니다. 예: 2026-11-06',
    '• 이름을 바꾸면 "기존 사람 사용중지 + 새 사람 추가"로 처리됩니다. 같은 사람 이름 수정은 앱 팀원 관리 화면에서 하세요.',
    '• 실제 인원 정보 대신 가상 데이터만 넣어 주세요.',
  ].forEach((t, i) => {
    const c = guide.getCell(`A${i + 1}`);
    c.value = t;
    if (i === 0) c.font = { bold: true, size: 16, color: { argb: 'FF4F46E5' } };
  });

  // 인원
  const ws = wb.addWorksheet('인원', { properties: { tabColor: { argb: 'FF6366F1' } } });
  header(
    ws,
    MEMBER_HEADERS,
    {
      '표시순서': '1~999. 비우면 맨 아래',
      '이름*': '찾는 기준(키). 지사 안에서 중복 불가',
      '등급*': GRADES.map((g) => GRADE_LABEL[g]).join(' / '),
      '역할*': '팀장 / 부팀장 / 팀원',
      '사용여부': 'Y(또는 빈칸)=사용, N=사용중지',
    },
    [10, 14, 14, 10, 10, 16, 30],
  );
  members.forEach((m) => ws.addRow([m.sort_order, m.name, GRADE_LABEL[m.grade], ROLE_LABEL[m.role], m.active ? 'Y' : 'N', null, null]));
  const mRows = Math.max(members.length + 50, 100);
  inputCells(ws, ['A', 'B', 'C', 'D', 'E', 'G'], mRows);
  for (let r = 2; r <= mRows; r++) ws.getCell(`F${r}`).value = { formula: `IF(C${r}="","",IF(C${r}="작업보조","N","Y"))` };
  list(ws, 'C', mRows, GRADES.map((g) => GRADE_LABEL[g]));
  list(ws, 'D', mRows, ROLES.map((r) => ROLE_LABEL[r]));
  list(ws, 'E', mRows, ['Y', 'N']);
  ws.addConditionalFormatting({
    ref: `B2:D${mRows}`,
    rules: [
      { type: 'expression', priority: 1, formulae: ['AND(COUNTA($A2:$E2)>0,B2="")'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFCA5A5' } } } },
    ],
  });
  ws.addConditionalFormatting({
    ref: `B2:B${mRows}`,
    rules: [{ type: 'expression', priority: 2, formulae: ['AND(B2<>"",COUNTIF($B$2:$B$' + mRows + ',B2)>1)'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF87171' } } } }],
  });

  // 작업루틴
  const wr = wb.addWorksheet('작업루틴', { properties: { tabColor: { argb: 'FF10B981' } } });
  header(
    wr,
    ROUTINE_HEADERS,
    {
      '루틴번호*': '찾는 기준(키). 1~999, 지사 안에서 중복 불가',
      '장소*': 'A / B / C',
      '작업시간(분)*': '10, 20, 30, 40, 50, 60',
      '필요인원(명)*': '1, 2, 3 (1명 작업은 기술자만)',
      '주기*': CYCLES.map((c) => CYCLE_LABEL[c]).join(' / '),
      '기준일': '일일 외 필수. 주기 계산 기준 날짜 (예: 2026-11-06)',
      '사용여부': 'Y(또는 빈칸)=사용, N=사용중지',
    },
    [11, 28, 8, 13, 13, 9, 13, 10, 30],
  );
  routines.forEach((r) =>
    wr.addRow([r.routine_no, r.name, r.place, r.duration_min, r.headcount, CYCLE_LABEL[r.cycle], r.anchor_date ?? null, r.active ? 'Y' : 'N', null]),
  );
  const rRows = Math.max(routines.length + 50, 200);
  inputCells(wr, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], rRows);
  for (let r = 2; r <= rRows; r++) wr.getCell(`G${r}`).numFmt = '@';
  list(wr, 'C', rRows, ['A', 'B', 'C']);
  list(wr, 'D', rRows, ['10', '20', '30', '40', '50', '60']);
  list(wr, 'E', rRows, ['1', '2', '3']);
  list(wr, 'F', rRows, CYCLES.map((c) => CYCLE_LABEL[c]));
  list(wr, 'H', rRows, ['Y', 'N']);
  wr.addConditionalFormatting({
    ref: `A2:F${rRows}`,
    rules: [{ type: 'expression', priority: 1, formulae: ['AND(COUNTA($A2:$H2)>0,A2="")'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFCA5A5' } } } }],
  });
  wr.addConditionalFormatting({
    ref: `A2:A${rRows}`,
    rules: [{ type: 'expression', priority: 2, formulae: ['AND(A2<>"",COUNTIF($A$2:$A$' + rRows + ',A2)>1)'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF87171' } } } }],
  });

  // 요약
  const sum = wb.addWorksheet('요약', { properties: { tabColor: { argb: 'FFF59E0B' } } });
  sum.getColumn(1).width = 18;
  for (let i = 2; i <= 5; i++) sum.getColumn(i).width = 12;
  sum.getCell('A1').value = '등급별 인원 (사용 중)';
  sum.getCell('A1').font = { bold: true };
  GRADES.forEach((g, i) => {
    sum.getCell(`A${i + 2}`).value = GRADE_LABEL[g];
    sum.getCell(`B${i + 2}`).value = { formula: `COUNTIFS(인원!$C:$C,"${GRADE_LABEL[g]}",인원!$E:$E,"<>N")` };
  });
  sum.getCell('A7').value = '합계';
  sum.getCell('B7').value = { formula: 'SUM(B2:B6)' };
  sum.getCell('A9').value = '주기 × 장소별 작업 수';
  sum.getCell('A9').font = { bold: true };
  ['A', 'B', 'C'].forEach((p, j) => (sum.getCell(9, j + 2).value = `장소 ${p}`));
  CYCLES.forEach((c, i) => {
    sum.getCell(`A${i + 10}`).value = CYCLE_LABEL[c];
    ['A', 'B', 'C'].forEach((p, j) => {
      sum.getCell(i + 10, j + 2).value = { formula: `COUNTIFS(작업루틴!$F:$F,"${CYCLE_LABEL[c]}",작업루틴!$C:$C,"${p}",작업루틴!$H:$H,"<>N")` };
    });
  });
  sum.getCell('A18').value = '일일작업 소요량(사람×분)';
  sum.getCell('A18').font = { bold: true };
  sum.getCell('B18').value = { formula: `SUMPRODUCT((작업루틴!$F$2:$F$${rRows}="일일")*(작업루틴!$H$2:$H$${rRows}<>"N")*작업루틴!$D$2:$D$${rRows}*작업루틴!$E$2:$E$${rRows})` };
  sum.getCell('A19').value = '18명 하루 용량 대비';
  sum.getCell('B19').value = { formula: 'IFERROR(B18/(B7*420),0)' };
  sum.getCell('B19').numFmt = '0%';

  return Buffer.from(await wb.xlsx.writeBuffer());
}
