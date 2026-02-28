const SUPABASE_URL = 'https://vbxwnuahsljkvpfrkfcd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZieHdudWFoc2xqa3ZwZnJrZmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzU3ODYsImV4cCI6MjA3NzMxMTc4Nn0.HYsRLQT_WlItxiMK_Z7ZGDIMkEHA2n3bX1jtJJHtmFI';

let supabaseClient = null;

function loadSupabaseSdk() {
    return new Promise((resolve, reject) => {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Supabase SDK'));
        document.head.appendChild(script);
    });
}

async function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    await loadSupabaseSdk();
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
}

async function requireAuthIfNeeded() {
    if (document.body && document.body.dataset && document.body.dataset.page === 'auth') return;
    if (!document.body || !document.body.dataset || document.body.dataset.requireAuth !== 'true') return;

    const sb = await getSupabaseClient();
    const { data } = await sb.auth.getSession();
    if (!data || !data.session) {
        window.location.href = 'login.html';
    }
}
