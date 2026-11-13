import bcrypt from 'bcryptjs';
import { store } from '@/lib/db';
import { randomCode } from '@/lib/auth';
import { body, HttpError, route } from '@/lib/server';

/** 새 지사 만들기 (F18) */
export const POST = route(async (req) => {
  const b = await body<{ name?: string; password?: string }>(req);
  const name = String(b.name ?? '').trim();
  const password = String(b.password ?? '');
  if (name.length < 2 || name.length > 40) throw new HttpError(400, '지사 이름을 2~40자로 입력해 주세요');
  if (password.length < 6) throw new HttpError(400, '관리자 비밀번호는 6자 이상이어야 해요');
  const s = store();
  let code = randomCode();
  while (await s.getBranchByCode(code)) code = randomCode();
  const branch = await s.createBranch({ name, code, admin_password_hash: await bcrypt.hash(password, 10) });
  return { code: branch.code, name: branch.name };
});
