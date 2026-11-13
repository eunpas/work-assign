import { NextResponse } from 'next/server';
import { store } from './db';
import { isAdminFor } from './auth';
import { blockedMap } from './time';
import type { Branch } from './types';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export type CodeCtx = { params: Promise<{ code: string }> };
export type IdCtx = { params: Promise<{ code: string; id: string }> };

export function route<C>(fn: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C) => {
    try {
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message, code: e.code, ...e.extra }, { status: e.status });
      if (e instanceof Error && e.message === 'DUPLICATE') return NextResponse.json({ error: '이미 같은 이름(번호)이 있어요' }, { status: 409 });
      if (e instanceof Error && e.message === 'NOT_FOUND') return NextResponse.json({ error: '찾을 수 없어요' }, { status: 404 });
      console.error(e);
      return NextResponse.json({ error: '서버 오류가 발생했어요' }, { status: 500 });
    }
  };
}

export async function getBranch(code: string): Promise<Branch> {
  const b = await store().getBranchByCode(code);
  if (!b) throw new HttpError(404, '지사를 찾을 수 없어요. 링크를 확인해 주세요');
  return b;
}

/** 쓰기 요청은 관리자 쿠키가 있을 때만 (F11) */
export async function requireAdmin(code: string): Promise<Branch> {
  const b = await getBranch(code);
  if (!(await isAdminFor(b))) throw new HttpError(401, '관리자 로그인이 필요해요', 'auth');
  return b;
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, '요청 형식이 올바르지 않아요');
  }
}

export function xlsxResponse(buf: Buffer, filename: string) {
  return new Response(new Uint8Array(buf), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="download.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'cache-control': 'no-store',
    },
  });
}

export async function blockedFor(branchId: string, date: string) {
  const abs = await store().listAbsences(branchId, date, date);
  return { absences: abs, blocked: blockedMap(abs, date) };
}
