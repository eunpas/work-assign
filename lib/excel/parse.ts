/** 입력 양식 읽기 (F21·F22 공용) — 6.1-1 규칙 */
import ExcelJS from 'exceljs';
import { CYCLE_LABEL, CYCLES, GRADE_LABEL, GRADES, ROLE_LABEL, ROLES, type Cycle, type Grade, type Place, type Role } from '../types';
import { fmtDate, isValidDate } from '../time';

export interface ParsedMember {
  row: number;
  name: string;
  grade: Grade;
  role: Role;
  sort_order: number | null;
  active: boolean;
}
export interface ParsedRoutine {
  row: number;
  routine_no: number;
  name: string;
  place: Place;
  duration_min: number;
  headcount: number;
  cycle: Cycle;
  anchor_date: string | null;
  active: boolean;
}
export interface SheetError {
  sheet: string;
  row: number;
  message: string;
}
export interface ParseResult {
  members: ParsedMember[];
  routines: ParsedRoutine[];
  errors: SheetError[];
}

export class FormatError extends Error {
  constructor(
    message: string,
    public code: 'sheet' | 'header' | 'file',
  ) {
    super(message);
  }
}

const invert = <K extends string>(m: Record<K, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, K>;
const GRADE_BY = invert<Grade>(GRADE_LABEL);
const ROLE_BY = invert<Role>(ROLE_LABEL);
const CYCLE_BY = invert<Cycle>(CYCLE_LABEL);

function text(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return fmtDate(v);
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('').trim();
    if ('result' in v) return text((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    if ('text' in v) return String((v as { text: unknown }).text).trim();
    return '';
  }
  return String(v).trim();
}

function dateText(v: ExcelJS.CellValue): string {
  if (v instanceof Date) return fmtDate(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) return fmtDate(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000));
  const t = text(v).replace(/[./]/g, '-');
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : t;
}

function headerMap(ws: ExcelJS.Worksheet, required: string[], sheet: string) {
  const map: Record<string, number> = {};
  ws.getRow(1).eachCell((c, col) => {
    const t = text(c.value);
    if (t) map[t] = col;
  });
  const missing = required.filter((h) => !map[h]);
  if (missing.length) throw new FormatError(`'${sheet}' 시트의 첫 줄 제목을 양식과 똑같이 맞춰주세요 (없음: ${missing.join(', ')})`, 'header');
  return map;
}

const toInt = (s: string) => (/^\d+(\.0+)?$/.test(s) ? Math.round(Number(s)) : NaN);
const activeOf = (s: string) => (s === '' || s.toUpperCase() === 'Y' ? true : s.toUpperCase() === 'N' ? false : null);

export async function parseWorkbook(buf: Buffer | ArrayBuffer): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buf as any);
  } catch {
    throw new FormatError('엑셀(.xlsx) 파일을 읽을 수 없어요. 양식 파일이 맞는지 확인해 주세요', 'file');
  }
  const wsM = wb.getWorksheet('인원');
  const wsR = wb.getWorksheet('작업루틴');
  if (!wsM || !wsR) throw new FormatError("시트 이름을 '인원', '작업루틴'으로 맞춰주세요", 'sheet');

  const errors: SheetError[] = [];
  const members: ParsedMember[] = [];
  const routines: ParsedRoutine[] = [];

  // 인원
  const hm = headerMap(wsM, ['이름*', '등급*', '역할*'], '인원');
  const seenNames = new Map<string, number>();
  wsM.eachRow({ includeEmpty: false }, (row, r) => {
    if (r === 1) return;
    const get = (h: string) => (hm[h] ? text(row.getCell(hm[h]).value) : '');
    const raw = { order: get('표시순서'), name: get('이름*'), grade: get('등급*'), role: get('역할*'), use: get('사용여부') };
    if (!raw.order && !raw.name && !raw.grade && !raw.role && !raw.use) return; // 빈 줄
    const err = (message: string) => errors.push({ sheet: '인원', row: r, message });
    let bad = false;
    if (!raw.name) (err('이름이 비어 있어요'), (bad = true));
    const grade = GRADE_BY[raw.grade];
    if (!grade) (err(raw.grade ? `등급 '${raw.grade}'은(는) 쓸 수 없어요` : '등급이 비어 있어요'), (bad = true));
    const role = ROLE_BY[raw.role];
    if (!role) (err(raw.role ? `역할 '${raw.role}'은(는) 쓸 수 없어요` : '역할이 비어 있어요'), (bad = true));
    let order: number | null = null;
    if (raw.order) {
      order = toInt(raw.order);
      if (!(order >= 1 && order <= 999)) (err('표시순서는 1~999 숫자여야 해요'), (bad = true));
    }
    const active = activeOf(raw.use);
    if (active === null) (err('사용여부는 Y 또는 N이어야 해요'), (bad = true));
    if (raw.name) {
      if (seenNames.has(raw.name)) (err(`이름 '${raw.name}'이(가) ${seenNames.get(raw.name)}줄과 중복돼요`), (bad = true));
      else seenNames.set(raw.name, r);
    }
    if (!bad) members.push({ row: r, name: raw.name, grade: grade!, role: role!, sort_order: order, active: active! });
  });

  // 작업루틴
  const hr = headerMap(wsR, ['루틴번호*', '작업명*', '장소*', '작업시간(분)*', '필요인원(명)*', '주기*'], '작업루틴');
  const seenNo = new Map<number, number>();
  wsR.eachRow({ includeEmpty: false }, (row, r) => {
    if (r === 1) return;
    const get = (h: string) => (hr[h] ? text(row.getCell(hr[h]).value) : '');
    const raw = {
      no: get('루틴번호*'),
      name: get('작업명*'),
      place: get('장소*').toUpperCase(),
      dur: get('작업시간(분)*'),
      hc: get('필요인원(명)*'),
      cycle: get('주기*'),
      anchor: hr['기준일'] ? dateText(row.getCell(hr['기준일']).value) : '',
      use: get('사용여부'),
    };
    if (Object.values(raw).every((v) => !v)) return;
    const err = (message: string) => errors.push({ sheet: '작업루틴', row: r, message });
    let bad = false;
    const no = toInt(raw.no);
    if (!raw.no) (err('루틴번호가 비어 있어요'), (bad = true));
    else if (!(no >= 1 && no <= 999)) (err('루틴번호는 1~999 숫자여야 해요'), (bad = true));
    if (!raw.name) (err('작업명이 비어 있어요'), (bad = true));
    if (!['A', 'B', 'C'].includes(raw.place)) (err(raw.place ? `장소 '${raw.place}'은(는) 쓸 수 없어요 (A/B/C)` : '장소가 비어 있어요'), (bad = true));
    const dur = toInt(raw.dur);
    if (![10, 20, 30, 40, 50, 60].includes(dur)) (err(raw.dur ? '작업시간은 10~60분, 10분 단위여야 해요' : '작업시간이 비어 있어요'), (bad = true));
    const hc = toInt(raw.hc);
    if (![1, 2, 3].includes(hc)) (err(raw.hc ? '필요인원은 1~3명이어야 해요' : '필요인원이 비어 있어요'), (bad = true));
    const cycle = CYCLE_BY[raw.cycle];
    if (!cycle) (err(raw.cycle ? `주기 '${raw.cycle}'은(는) 쓸 수 없어요` : '주기가 비어 있어요'), (bad = true));
    let anchor: string | null = null;
    if (raw.anchor) {
      if (!isValidDate(raw.anchor)) (err(`기준일 '${raw.anchor}'을(를) 날짜로 읽을 수 없어요 (예: 2026-11-06)`), (bad = true));
      else anchor = raw.anchor;
    } else if (cycle && cycle !== 'daily') (err('일일 외 주기는 기준일이 필요해요'), (bad = true));
    const active = activeOf(raw.use);
    if (active === null) (err('사용여부는 Y 또는 N이어야 해요'), (bad = true));
    if (no >= 1) {
      if (seenNo.has(no)) (err(`루틴번호 ${no}이(가) ${seenNo.get(no)}줄과 중복돼요`), (bad = true));
      else seenNo.set(no, r);
    }
    if (!bad)
      routines.push({ row: r, routine_no: no, name: raw.name, place: raw.place as Place, duration_min: dur, headcount: hc, cycle: cycle!, anchor_date: anchor, active: active! });
  });

  return { members, routines, errors };
}

export { GRADES, ROLES, CYCLES };
