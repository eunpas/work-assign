/**
 * 가상 데이터 (8장). 실제 부대·인원 정보 없음 — 이름·작업명은 모두 지어낸 것.
 */
import type { Absence, Branch, Cycle, Grade, Member, Place, Role, Routine, Reason } from './types';

export const DEMO = {
  suwon: { code: 'sw7Qx2mPa9Lk', password: 'suwon1234', name: '수원지사(가상)' },
  test: { code: 'tb3Rn8vKe2Wd', password: 'test1234', name: '테스트지사(가상)' },
};

const SUWON_MEMBERS: [string, Grade, Role][] = [
  ['김하준', 'special', 'leader'],
  ['박도윤', 'advanced', 'sub_leader'],
  ['이서윤', 'special', 'member'],
  ['최지우', 'advanced', 'member'],
  ['정민준', 'advanced', 'member'],
  ['강서연', 'intermediate', 'member'],
  ['조예준', 'intermediate', 'member'],
  ['윤하은', 'intermediate', 'member'],
  ['장시우', 'junior', 'member'],
  ['임지호', 'junior', 'member'],
  ['한수아', 'junior', 'member'],
  ['오주원', 'junior', 'member'],
  ['서지안', 'junior', 'member'],
  ['신유찬', 'assistant', 'member'],
  ['권다은', 'assistant', 'member'],
  ['황이준', 'assistant', 'member'],
  ['안채원', 'assistant', 'member'],
  ['송건우', 'assistant', 'member'],
];

const DAILY_NAMES = [
  '통신실 온습도 점검', '장비 경보 로그 확인', '신규 회선 개통 작업', '케이블 포설 작업', '전원 공급 상태 확인',
  '교환기 상태 점검', '전송장비 표시등 점검', '회선 품질 측정', 'UPS 상태 확인', '네트워크 트래픽 확인',
  '서버랙 육안 점검', '장애 접수 처리', '단말기 교체 작업', '광선로 순회 점검', '출입 기록 정리',
  '예비 회선 절체 시험', '냉방기 가동 확인', '전화 회선 이전 작업', 'IP 대장 현행화', '무선 AP 상태 점검',
  'CCTV 회선 점검', '배선반 결선 정리', '장비 이벤트 로그 확인', '영상회의 장비 점검', '케이블 라벨 정비',
  '공용 PC 네트워크 점검', '유선전화 개통 작업', '방송 장비 점검', '접속함 상태 확인', '백본 스위치 점검',
  '장비 반출입 확인', '회선 장애 복구 작업', '광단자 연결 점검', '보안장비 상태 확인', '전산실 청결 점검',
  '교환 회선 시험 통화', '단말 설정 변경 작업', '통신 맨홀 외관 점검', '무전기 충전 상태 확인', '건물 간 회선 점검',
  '작업 일지 정리', '예비품 수량 확인', '방화벽 로그 확인', '신규 단말 설치', '전원 분배반 점검',
  '시험 장비 교정 확인', '통신 덕트 점검', '회의실 장비 세팅', '패치코드 교체 작업', '일일 결과 보고 정리',
];

// [작업시간, 필요인원, 개수] — 합계 사람×분 3,670
const DAILY_SPECS: [number, number, number][] = [
  [30, 2, 10], [20, 1, 4], [50, 2, 4], [40, 2, 8], [60, 2, 6],
  [10, 1, 5], [60, 1, 1], [50, 3, 4], [30, 3, 4], [40, 1, 4],
];

type PeriodicDef = { cycle: Cycle; names: string[]; due: [number, number][]; dueAnchors: string[]; otherAnchors: string[] };

const PERIODIC: PeriodicDef[] = [
  {
    cycle: 'weekly',
    names: ['축전지 셀 전압 측정', '광단자함 청결 점검', '백업 데이터 검증', '발전기 연료량 확인', '소방 감지기 외관 점검', '바닥 배선 점검', '예비 회선 시험', '장비 팬 필터 점검', '접지선 외관 점검', '교환기 설정 백업', '무선 신호 세기 측정', 'UPS 부하 확인', '전화번호부 현행화', '케이블 트레이 점검', '원격 접속 기록 점검', '장비 시각 동기화 확인'],
    due: [[60, 3], [40, 2], [30, 3], [10, 1], [20, 1]],
    dueAnchors: ['2026-11-06', '2026-10-30', '2026-10-23', '2026-10-16', '2026-11-06'],
    otherAnchors: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'],
  },
  {
    cycle: 'biweekly',
    names: ['랙 케이블 정리 상태 점검', '냉방기 필터 청소', '배터리 단자 청소', '광케이블 여장 정리', '항온항습기 점검', '비상조명 점검', '예비 단말 점검', '출입통제기 점검'],
    due: [[60, 3], [50, 2], [20, 2]],
    dueAnchors: ['2026-10-30', '2026-10-16', '2026-10-02'],
    otherAnchors: ['2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-05'],
  },
  {
    cycle: 'monthly',
    names: ['예비 장비 기능 점검', '발전기 무부하 운전', 'UPS 배터리 방전 시험', '회선 사용 현황 정리', '장비 재고 실사', '보안 패치 점검', '전력량 검침', '통신 품질 월간 측정', '소화기 압력 점검', '장비 이력 카드 정리'],
    due: [[60, 3], [50, 2], [20, 2]],
    dueAnchors: ['2026-10-13', '2026-09-13', '2026-08-13'],
    otherAnchors: ['2026-10-05', '2026-10-08', '2026-10-15', '2026-10-20', '2026-10-22', '2026-10-27', '2026-10-02'],
  },
  {
    cycle: 'quarterly',
    names: ['접지 상태 점검', '소방 설비 연동 시험', '케이블 절연 측정', '전원 계통 점검', '장비 성능 시험', '구내 선로 도면 확인'],
    due: [[60, 3], [40, 2]],
    dueAnchors: ['2026-08-13', '2026-05-13'],
    otherAnchors: ['2026-09-13', '2026-10-06', '2026-09-16', '2026-08-20'],
  },
  {
    cycle: 'semiannual',
    names: ['광케이블 손실 정밀 측정', '장비 펌웨어 점검', '비상 전원 전환 시험', '통신 관로 점검', '안테나 정렬 점검'],
    due: [[40, 2]],
    dueAnchors: ['2026-05-13'],
    otherAnchors: ['2026-06-10', '2026-07-02', '2026-09-09', '2026-08-18'],
  },
  {
    cycle: 'annual',
    names: ['접지저항 측정', '전체 회선 도면 현행화', '장비 내용연수 점검', '통신실 방수 점검', '종합 장애 대응 훈련'],
    due: [[50, 2], [30, 3]],
    dueAnchors: ['2025-11-13', '2024-11-13'],
    otherAnchors: ['2026-03-20', '2026-06-15', '2026-01-08'],
  },
];

const OTHER_SPECS: [number, number][] = [[30, 2], [40, 2], [60, 2], [20, 1], [50, 3], [30, 1], [40, 3], [60, 1]];
const PL: Place[] = ['A', 'B', 'C'];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let x = seed;
  for (let i = a.length - 1; i > 0; i--) {
    x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface RoutineSeed {
  routine_no: number;
  name: string;
  place: Place;
  duration_min: number;
  headcount: number;
  cycle: Cycle;
  anchor_date: string | null;
}

export function suwonRoutines(): RoutineSeed[] {
  const out: RoutineSeed[] = [];
  const specs: [number, number][] = [];
  for (const [d, h, n] of DAILY_SPECS) for (let i = 0; i < n; i++) specs.push([d, h]);
  const mixed = seededShuffle(specs, 7);
  DAILY_NAMES.forEach((name, i) => {
    out.push({ routine_no: i + 1, name, place: PL[i % 3], duration_min: mixed[i][0], headcount: mixed[i][1], cycle: 'daily', anchor_date: null });
  });
  let no = 51;
  let oi = 0;
  for (const def of PERIODIC) {
    def.names.forEach((name, i) => {
      const isDueItem = i < def.due.length;
      const [d, h] = isDueItem ? def.due[i] : OTHER_SPECS[oi++ % OTHER_SPECS.length];
      const anchor = isDueItem ? def.dueAnchors[i] : def.otherAnchors[(i - def.due.length) % def.otherAnchors.length];
      out.push({ routine_no: no, name, place: PL[(no - 1) % 3], duration_min: d, headcount: h, cycle: def.cycle, anchor_date: anchor });
      no++;
    });
  }
  return out;
}

export function suwonMembers() {
  return SUWON_MEMBERS.map(([name, grade, role], i) => ({ name, grade, role, sort_order: i + 1 }));
}

const TEST_MEMBERS: [string, Grade, Role][] = [
  ['가나다', 'special', 'leader'],
  ['라마바', 'intermediate', 'sub_leader'],
  ['사아자', 'junior', 'member'],
  ['차카타', 'assistant', 'member'],
  ['파하가', 'assistant', 'member'],
];

export interface SeedDB {
  branches: Branch[];
  members: Member[];
  routines: Routine[];
  absences: Absence[];
}

/** 로컬 저장소·seed.sql 공용 가상 데이터 생성 */
export function buildSeed(hash: (pw: string) => string, uuid: () => string): SeedDB {
  const now = new Date().toISOString();
  const suwon: Branch = { id: uuid(), name: DEMO.suwon.name, code: DEMO.suwon.code, admin_password_hash: hash(DEMO.suwon.password), google_sheet_url: null, created_at: now };
  const test: Branch = { id: uuid(), name: DEMO.test.name, code: DEMO.test.code, admin_password_hash: hash(DEMO.test.password), google_sheet_url: null, created_at: now };
  const members: Member[] = [
    ...suwonMembers().map((m) => ({ ...m, id: uuid(), branch_id: suwon.id, active: true })),
    ...TEST_MEMBERS.map(([name, grade, role], i) => ({ id: uuid(), branch_id: test.id, name, grade, role, sort_order: i + 1, active: true })),
  ];
  const routines: Routine[] = [
    ...suwonRoutines().map((r) => ({ ...r, id: uuid(), branch_id: suwon.id, active: true })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: uuid(),
      branch_id: test.id,
      routine_no: i + 1,
      name: `테스트 작업 ${i + 1}`,
      place: PL[i % 3],
      duration_min: [20, 30, 40][i % 3],
      headcount: [1, 2, 2, 3][i % 4],
      cycle: 'daily' as Cycle,
      anchor_date: null,
      active: true,
    })),
  ];
  const byName = (n: string) => members.find((m) => m.name === n && m.branch_id === suwon.id)!.id;
  const abs = (name: string, sd: string, st: string, ed: string, et: string, allDay: boolean, reason: Reason, note: string | null): Absence => ({
    id: uuid(),
    branch_id: suwon.id,
    member_id: byName(name),
    start_date: sd,
    start_time: st,
    end_date: ed,
    end_time: et,
    all_day: allDay,
    reason,
    note,
  });
  const absences: Absence[] = [
    abs('임지호', '2026-11-16', '13:00', '2026-11-18', '12:00', false, '출장', '가상 출장 (여러 날 부재 예시)'),
    abs('권다은', '2026-11-17', '08:00', '2026-11-17', '17:00', true, '휴가', null),
  ];
  return { branches: [suwon, test], members, routines, absences };
}
