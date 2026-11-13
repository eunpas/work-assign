/** 가상 데이터를 supabase/seed.sql 로 만든다: npm run seed:sql */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { buildSeed } from '../lib/seed-data';

const seed = buildSeed((pw) => bcrypt.hashSync(pw, 10), () => crypto.randomUUID());
const q = (v: unknown) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

function insert(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return `insert into ${table} (${cols.join(', ')}) values\n${rows.map((r) => `  (${cols.map((c) => q(r[c])).join(', ')})`).join(',\n')};\n\n`;
}

let sql = '-- 작업배정 가상 데이터 (실제 정보 없음). schema.sql 실행 후 실행하세요.\n\n';
sql += insert('branches', seed.branches.map(({ created_at: _c, ...b }) => b));
sql += insert('members', seed.members as unknown as Record<string, unknown>[]);
sql += insert('routines', seed.routines as unknown as Record<string, unknown>[]);
sql += insert('absences', seed.absences as unknown as Record<string, unknown>[]);

const out = path.join(__dirname, '..', 'supabase', 'seed.sql');
fs.writeFileSync(out, sql);
console.log(`wrote ${out}`);
