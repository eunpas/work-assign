import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { Branch } from './types';

export const SESSION_HOURS = 12;
const DEV_SECRET = 'dev-only-insecure-secret-change-me-0123456789';

function secret() {
  const raw = process.env.SESSION_SECRET;
  if (raw && raw !== 'REPLACE_ME' && raw.length >= 16) return raw;
  // SESSION_SECRET이 없으면 서버만 아는 Supabase 비밀 키에서 서명용 비밀값을 만들어 쓴다
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key && key !== 'REPLACE_ME') return crypto.createHash('sha256').update(`work-assign-session:${key}`).digest('base64url');
  return DEV_SECRET;
}

export const cookieName = (code: string) => `wa_admin_${code}`;

// 서명에 현재 비밀번호 해시를 섞는다 → 비밀번호를 바꾸면 기존 로그인은 모두 풀린다
const sign = (body: string, pwHash: string) => crypto.createHmac('sha256', secret()).update(`${body}|${pwHash}`).digest('base64url');

export function makeToken(b: Pick<Branch, 'id' | 'admin_password_hash'>) {
  const body = `${b.id}.${Date.now() + SESSION_HOURS * 3600 * 1000}`;
  return `${body}.${sign(body, b.admin_password_hash)}`;
}

export function verifyToken(token: string, b: Pick<Branch, 'id' | 'admin_password_hash'>) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [id, exp, sig] = parts;
  if (id !== b.id || Number(exp) < Date.now()) return false;
  const x = Buffer.from(sig);
  const y = Buffer.from(sign(`${id}.${exp}`, b.admin_password_hash));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function isAdminFor(b: Branch) {
  const c = (await cookies()).get(cookieName(b.code))?.value;
  return !!c && verifyToken(c, b);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_HOURS * 3600,
};

export function randomCode(len = 12) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (x) => chars[x % chars.length]).join('');
}
