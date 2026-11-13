import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { cookieName, cookieOptions, makeToken } from '@/lib/auth';
import { body, HttpError, requireAdmin, route, type CodeCtx } from '@/lib/server';

/** 관리자 비밀번호 변경 — 현재 비밀번호 확인 후 변경, 다른 기기의 로그인은 모두 해제 */
export const PUT = route<CodeCtx>(async (req, { params }) => {
  const { code } = await params;
  const b = await requireAdmin(code);
  const { current, next } = await body<{ current?: string; next?: string }>(req);
  const cur = String(current ?? '');
  const nxt = String(next ?? '');
  if (!cur || !(await bcrypt.compare(cur, b.admin_password_hash))) {
    await new Promise((r) => setTimeout(r, 600));
    throw new HttpError(400, '현재 비밀번호가 맞지 않아요', 'current');
  }
  if (nxt.length < 8 || nxt.length > 72) throw new HttpError(400, '새 비밀번호는 8~72자로 정해 주세요', 'next');
  if (!/[A-Za-z]/.test(nxt) || !/\d/.test(nxt)) throw new HttpError(400, '새 비밀번호에 영문과 숫자를 함께 넣어 주세요', 'next');
  if (nxt === cur) throw new HttpError(400, '지금과 다른 비밀번호를 정해 주세요', 'next');

  const hash = await bcrypt.hash(nxt, 10);
  await store().updateBranch(b.id, { admin_password_hash: hash });

  // 이 브라우저는 새 비밀번호 기준으로 다시 로그인 상태 유지
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(code), makeToken({ id: b.id, admin_password_hash: hash }), cookieOptions);
  return res;
});
