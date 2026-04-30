import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 개발 초기에는 env 미설정 가능 — Auth 호출 시점에 실패하도록 지연
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 미설정');
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) {
      throw new Error('Supabase env vars missing: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
    }
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
