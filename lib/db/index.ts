import type { Store } from './types';
import { localStore } from './local';
import { supabaseStore } from './supabase';

export function store(): Store {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // 값이 아직 자리표시(REPLACE_ME)면 키가 없는 것으로 본다
  return process.env.SUPABASE_URL && key && key !== 'REPLACE_ME' ? supabaseStore : localStore;
}
