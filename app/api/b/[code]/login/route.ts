import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { cookieName, makeToken, SESSION_HOURS } from '@/lib/auth';
import { body, getBranch, HttpError, route, type CodeCtx } from '@/lib/server';

export const POST = route<CodeCtx>(async (req, { params }) => {
  const { code } = await params;
  const b = await getBranch(code);
  const { password } = await body<{ password?: string }>(req);
  const ok = !!password && (await bcrypt.compare(String(password), b.admin_password_hash));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600));
    throw new HttpError(401, '비밀번호가 맞지 않아요');
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(code), makeToken(b.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
});

export const DELETE = route<CodeCtx>(async (_req, { params }) => {
  const { code } = await params;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(code), '', { path: '/', maxAge: 0 });
  return res;
});
