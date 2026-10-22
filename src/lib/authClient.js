import { createClient } from '@supabase/supabase-js';

function cleanUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}

function cleanKey(value) {
    return String(value || '').trim();
}

function usable(url, key) {
    return Boolean(
        url &&
            key &&
            !/your-project|your-anon|replace-me/i.test(url + ' ' + key)
    );
}

const buildUrl = cleanUrl(import.meta.env.VITE_SUPABASE_URL);
const buildAnonKey = cleanKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

let clientPromise = null;

async function createSupabaseClient() {
    let url = buildUrl;
    let anonKey = buildAnonKey;

    // Vite injects VITE_* values at build time. A deployment can still provide
    // the public browser values at runtime through the server config endpoint.
    if (!usable(url, anonKey)) {
        try {
            const response = await fetch('/api/config', {
                headers: { Accept: 'application/json' }
            });

            if (response.ok) {
                const config = await response.json();
                url = cleanUrl(config.supabaseUrl);
                anonKey = cleanKey(config.supabaseAnonKey);
            }
        } catch {
            // Leave auth disabled when the config endpoint is unavailable.
        }
    }

    if (!usable(url, anonKey)) return null;

    return createClient(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
}

export function getSupabase() {
    if (!clientPromise) {
        clientPromise = createSupabaseClient().catch(() => null);
    }

    return clientPromise;
}

export async function getAccessToken() {
    const client = await getSupabase();
    if (!client) return null;

    const { data } = await client.auth.getSession();
    return (data.session && data.session.access_token) || null;
}
