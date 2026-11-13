/**
 * 자동 배정 (5장). 브라우저에서 실행.
 * "어려운 작업부터 빈자리에 채워 넣고, 순서를 바꿔 여러 번 해본 뒤 가장 좋은 결과를 고른다."
 */
import { BLOCKS, SLOT_COUNT, breakOf } from '../time';

export interface SchedMember {
  id: string;
  tech: boolean;
  /** 길이 54. true = 부재로 막힌 칸 */
  blocked: boolean[];
}
export interface SchedTask {
  id: string;
  place: string;
  duration_min: number;
  headcount: number;
}
export interface SchedCell {
  member_id: string;
  slot: number;
  routine_id: string;
}
export interface SchedResult {
  cells: SchedCell[];
  unassigned: { routine_id: string; reason: string }[];
  moves: number;
  end: number;
  iterations: number;
  ms: number;
}
export interface SchedOptions {
  timeLimitMs?: number;
  maxIterations?: number;
  seed?: number;
}

const FREE = -1;
const BLOCK = -2;

/** 작업 길이(칸)별 가능한 시작 칸 — 점심·체육을 걸치지 않게 (R3) */
const STARTS: number[][] = Array.from({ length: 7 }, (_, d) => {
  const list: number[] = [];
  if (d > 0) for (const [a, b] of BLOCKS) for (let s = a; s + d <= b; s++) list.push(s);
  return list;
});

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

interface Outcome {
  occ: Int16Array[];
  unassigned: { idx: number; reason: string }[];
  moves: number;
  end: number;
}

interface Cand {
  p: number;
  tech: boolean;
  key: number;
}

function runOnce(M: SchedMember[], T: SchedTask[], order: number[], rnd: () => number, scan: boolean): Outcome {
  const n = M.length;
  const occ = M.map((m) => {
    const a = new Int16Array(SLOT_COUNT).fill(FREE);
    for (let s = 0; s < SLOT_COUNT; s++) if (m.blocked[s] || breakOf(s)) a[s] = BLOCK;
    return a;
  });
  const unassigned: Outcome['unassigned'] = [];

  for (const idx of order) {
    const t = T[idx];
    const d = t.duration_min / 10;
    const h = t.headcount;
    const pl = t.place;
    let bestS = -1;
    let bestPeople: number[] | null = null;
    let bestCost = Infinity;
    let sawNoTech = false;

    for (const s of STARTS[d] ?? []) {
      const cs: Cand[] = [];
      for (let p = 0; p < n; p++) {
        const o = occ[p];
        let ok = true;
        for (let k = s; k < s + d; k++)
          if (o[k] !== FREE) {
            ok = false;
            break;
          }
        if (!ok) continue; // R1, R5
        const pv = s > 0 ? o[s - 1] : FREE;
        if (pv >= 0 && T[pv].place !== pl) continue; // R6
        const nx = s + d < SLOT_COUNT ? o[s + d] : FREE;
        if (nx >= 0 && T[nx].place !== pl) continue; // R6
        let pp: string | null = null;
        for (let k = s - 1; k >= 0; k--)
          if (o[k] >= 0) {
            pp = T[o[k]].place;
            break;
          }
        let np: string | null = null;
        for (let k = s + d; k < SLOT_COUNT; k++)
          if (o[k] >= 0) {
            np = T[o[k]].place;
            break;
          }
        const add = (pp !== null && pp !== pl ? 1 : 0) + (np !== null && np !== pl ? 1 : 0) - (pp !== null && np !== null && pp !== np ? 1 : 0);
        let gb = 0;
        for (let k = s - 1; k >= 0 && o[k] === FREE; k--) gb++;
        let ga = 0;
        for (let k = s + d; k < SLOT_COUNT && o[k] === FREE; k++) ga++;
        const adj = (pv >= 0 ? 1 : 0) + (nx >= 0 ? 1 : 0);
        // 쓸모없는 10~20분 자투리 빈칸을 만들면 감점 (이동용 10분 칸은 예외)
        const waste =
          (gb > 0 && gb <= 2 && !(gb === 1 && pp !== null && pp !== pl) ? 1 : 0) +
          (ga > 0 && ga <= 2 && !(ga === 1 && np !== null && np !== pl) ? 1 : 0);
        cs.push({ p, tech: M[p].tech, key: add * 100 - adj * 8 + waste * 6 + rnd() * 3 });
      }
      if (cs.length < h) continue;
      let ti = -1;
      for (let i = 0; i < cs.length; i++) if (cs[i].tech && (ti < 0 || cs[i].key < cs[ti].key)) ti = i;
      if (ti < 0) {
        sawNoTech = true; // R2
        continue;
      }
      const lead = cs[ti];
      // 나머지 자리는 작업보조 우선 (기술자 자리 아끼기)
      const rest = cs.filter((_, i) => i !== ti).sort((a, b) => a.key + (a.tech ? 4 : 0) - (b.key + (b.tech ? 4 : 0)));
      const chosen = [lead, ...rest.slice(0, h - 1)]; // R7
      if (!scan) {
        bestS = s;
        bestPeople = chosen.map((c) => c.p);
        break;
      }
      let cost = s * 0.5;
      for (const c of chosen) cost += c.key;
      if (cost < bestCost) {
        bestCost = cost;
        bestS = s;
        bestPeople = chosen.map((c) => c.p);
      }
    }

    if (bestPeople) {
      for (const p of bestPeople) for (let k = bestS; k < bestS + d; k++) occ[p][k] = idx; // R4
    } else {
      unassigned.push({
        idx,
        reason: sawNoTech
          ? '기술자 부족 — 같은 시간에 비어 있는 기술자가 없어요'
          : `연속 시간·인원 부족 — ${h}명이 동시에 ${t.duration_min}분 연속으로 비는 시간이 없어요`,
      });
    }
  }

  let moves = 0;
  let end = 0;
  for (const o of occ) {
    let last: string | null = null;
    let lastIdx = -1;
    for (let s = 0; s < SLOT_COUNT; s++) {
      const v = o[s];
      if (v < 0) continue;
      end = Math.max(end, s + 1);
      if (v !== lastIdx) {
        const pl = T[v].place;
        if (last !== null && last !== pl) moves++;
        last = pl;
        lastIdx = v;
      }
    }
  }
  return { occ, unassigned, moves, end };
}

const better = (a: Outcome, b: Outcome) =>
  a.unassigned.length !== b.unassigned.length
    ? a.unassigned.length < b.unassigned.length
    : a.moves !== b.moves
      ? a.moves < b.moves
      : a.end < b.end;

function perturb(base: number[], T: SchedTask[], rnd: () => number, it: number): number[] {
  const v = it % 3;
  const size = (i: number) => T[i].headcount * 100 + T[i].duration_min;
  if (v === 0) {
    return base
      .map((i) => ({ i, k: size(i) * (0.65 + rnd() * 0.7) }))
      .sort((a, b) => b.k - a.k)
      .map((x) => x.i);
  }
  if (v === 1) {
    const rank: Record<string, number> = {};
    ['A', 'B', 'C'].sort(() => rnd() - 0.5).forEach((p, i) => (rank[p] = i));
    return base
      .map((i) => ({ i, k: size(i) * (0.85 + rnd() * 0.3), r: T[i].headcount }))
      .sort((a, b) => b.r - a.r || rank[T[a.i].place] - rank[T[b.i].place] || b.k - a.k)
      .map((x) => x.i);
  }
  const o = base.slice();
  const k = 1 + Math.floor(rnd() * 10);
  for (let j = 0; j < k; j++) {
    const a = Math.floor(rnd() * o.length);
    const b = Math.min(o.length - 1, a + 1 + Math.floor(rnd() * 6));
    [o[a], o[b]] = [o[b], o[a]];
  }
  return o;
}

export function autoAssign(members: SchedMember[], tasks: SchedTask[], opts: SchedOptions = {}): SchedResult {
  const t0 = now();
  const timeLimit = opts.timeLimitMs ?? 1500;
  const maxIter = opts.maxIterations ?? 1_000_000;
  const rnd = rng(opts.seed ?? 20261113);
  const valid = tasks.filter((t) => t.duration_min >= 10 && t.duration_min <= 60 && t.duration_min % 10 === 0 && t.headcount >= 1);
  const invalid = tasks.filter((t) => !valid.includes(t));
  const T = valid;
  const base = T.map((_, i) => i).sort(
    (a, b) => T[b].headcount - T[a].headcount || T[b].duration_min - T[a].duration_min || T[a].place.localeCompare(T[b].place) || a - b,
  );

  let best: Outcome | null = null;
  let it = 0;
  while (it < maxIter && (it === 0 || now() - t0 < timeLimit)) {
    const order = it === 0 ? base : perturb(base, T, rnd, it);
    const out = runOnce(members, T, order, rnd, it > 0 && rnd() < 0.35);
    if (!best || better(out, best)) best = out;
    it++;
    if (best.unassigned.length === 0 && best.moves === 0) break;
  }

  const cells: SchedCell[] = [];
  best!.occ.forEach((o, p) => {
    for (let s = 0; s < SLOT_COUNT; s++) if (o[s] >= 0) cells.push({ member_id: members[p].id, slot: s, routine_id: T[o[s]].id });
  });
  return {
    cells,
    unassigned: [
      ...best!.unassigned.map((u) => ({ routine_id: T[u.idx].id, reason: u.reason })),
      ...invalid.map((t) => ({ routine_id: t.id, reason: '작업시간·필요인원 값이 올바르지 않아요' })),
    ],
    moves: best!.moves,
    end: best!.end,
    iterations: it,
    ms: Math.round(now() - t0),
  };
}
