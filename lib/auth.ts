import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { Branch } from './types';

export const SESSION_HOURS = 12;
const DEV_SECRET = 'dev-only-insecure-secret-change-me-0123456789';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production' && process.env.SUPABASE_URL) throw new Error('SESSION_SECRET 환경변수가 필요해요');
  return s || DEV_SECRET;
}

export const cookieName = (code: string) => `wa_admin_${code}`;

const sign = (body: string) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

export function makeToken(branchId: string) {
  const body = `${branchId}.${Date.now() + SESSION_HOURS * 3600 * 1000}`;
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string, branchId: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [id, exp, sig] = parts;
  if (id !== branchId || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(`${id}.${exp}`));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function isAdminFor(b: Branch) {
  const c = (await cookies()).get(cookieName(b.code))?.value;
  return !!c && verifyToken(c, b.id);
}

export function randomCode(len = 12) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (x) => chars[x % chars.length]).join('');
}
