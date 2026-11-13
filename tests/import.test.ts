import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildTemplate } from '../lib/excel/template';
import { parseWorkbook, FormatError } from '../lib/excel/parse';
import { diffImport } from '../lib/importer';
import { suwonMembers, suwonRoutines } from '../lib/seed-data';
import type { Member, Routine } from '../lib/types';

const members: Member[] = suwonMembers().map((m, i) => ({ ...m, id: `m${i}`, branch_id: 'b', active: true }));
const routines: Routine[] = suwonRoutines().map((r, i) => ({ ...r, id: `r${i}`, branch_id: 'b', active: true }));

async function edit(fn: (wb: ExcelJS.Workbook) => void) {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load((await buildTemplate(members, routines)) as any);
  fn(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('입력 양식 (F20·F21)', () => {
  it('현재 데이터 양식을 그대로 올리면 변경 0건 (18명·100개 그대로 읽힘)', async () => {
    const p = await parseWorkbook(await buildTemplate(members, routines));
    expect(p.errors).toEqual([]);
    expect(p.members).toHaveLength(18);
    expect(p.routines).toHaveLength(100);
    expect(diffImport(p, { members, routines }).counts).toEqual({ add: 0, update: 0, deactivate: 0, error: 0 });
  });

  it('새 지사(빈 DB)에 올리면 18명·100개 추가', async () => {
    const p = await parseWorkbook(await buildTemplate(members, routines));
    const c = diffImport(p, { members: [], routines: [] }).counts;
    expect(c.add).toBe(118);
  });

  it('1명 추가 · 작업 2개 수정 · 1개 N → 추가 1 / 수정 2 / 사용중지 1', async () => {
    const buf = await edit((wb) => {
      const ws = wb.getWorksheet('인원')!;
      ws.getRow(20).values = [19, '나신입', '초급기술자', '팀원', 'Y'];
      const wr = wb.getWorksheet('작업루틴')!;
      wr.getCell('D2').value = wr.getCell('D2').value === 60 ? 50 : 60; // 1번 작업시간 변경
      wr.getCell('B3').value = '이름 바뀐 작업'; // 2번 작업명 변경
      wr.getCell('H4').value = 'N'; // 3번 사용중지
    });
    const p = await parseWorkbook(buf);
    expect(p.errors).toEqual([]);
    expect(diffImport(p, { members, routines }).counts).toEqual({ add: 1, update: 2, deactivate: 1, error: 0 });
  });

  it('필수값 비움·루틴번호 중복 → 시트·줄 오류, 반영 대상 없음', async () => {
    const buf = await edit((wb) => {
      wb.getWorksheet('인원')!.getCell('B3').value = null;
      wb.getWorksheet('작업루틴')!.getCell('A5').value = 1;
    });
    const p = await parseWorkbook(buf);
    expect(p.errors.length).toBeGreaterThanOrEqual(2);
    expect(p.errors.find((e) => e.sheet === '인원' && e.row === 3)).toBeTruthy();
    expect(p.errors.find((e) => e.sheet === '작업루틴' && e.row === 5)).toBeTruthy();
  });

  it('시트 이름이 다르면 안내', async () => {
    const buf = await edit((wb) => {
      wb.getWorksheet('인원')!.name = '사람';
    });
    await expect(parseWorkbook(buf)).rejects.toBeInstanceOf(FormatError);
  });
});
