import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const authConfigured = Boolean(
    url && anonKey && !/your-project/i.test(url) && !/your-anon/i.test(anonKey)
);

export const supabase = authConfigured
    ? createClient(url, anonKey, {
          auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
          }
      })
    : null;

export async function getAccessToken() {
    if (!supabase) return null;

    const { data } = await supabase.auth.getSession();
    return (data.session && data.session.access_token) || null;
}
