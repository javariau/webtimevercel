if (typeof window.supabaseClient === 'undefined') {
    var supabaseClient = null;
    var supabaseClientPromise = null;
    var supabasePublicConfig = null;
}

function loadSupabaseSdk() {
    return new Promise((resolve, reject) => {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Gagal memuat Supabase SDK. Pastikan internet aktif.'));
        document.head.appendChild(script);
    });
}

async function getSupabasePublicConfig() {
    if (supabasePublicConfig) return supabasePublicConfig;

    // 1. Coba ambil dari Backend API (jika ada) - Prioritas Utama
    try {
        const res = await fetch('/api/supabase-public-config', { cache: 'no-store' });
        if (res.ok) {
            const cfg = await res.json();
            if (cfg && cfg.url && cfg.anonKey) {
                supabasePublicConfig = { 
                    url: cfg.url, 
                    anonKey: cfg.anonKey,
                    ytApiKey: cfg.ytApiKey, // Tambahkan YT API Key
                    midtransClientKey: cfg.midtransClientKey, // Tambahkan Midtrans Client Key
                    midtransIsProduction: cfg.midtransIsProduction // Tambahkan Mode Midtrans
                };
                return supabasePublicConfig;
            }
        }
    } catch (e) {
        console.warn('Backend config fetch failed, checking local fallback...');
    }

    // 2. Coba ambil dari window.TT_PUBLIC_CONFIG (Cadangan Lokal)
    if (window.TT_PUBLIC_CONFIG && window.TT_PUBLIC_CONFIG.SUPABASE_URL && window.TT_PUBLIC_CONFIG.SUPABASE_ANON_KEY) {
        return {
            url: window.TT_PUBLIC_CONFIG.SUPABASE_URL,
            anonKey: window.TT_PUBLIC_CONFIG.SUPABASE_ANON_KEY,
            ytApiKey: window.TT_PUBLIC_CONFIG.YT_API_KEY
        };
    }

    throw new Error('Konfigurasi Supabase tidak ditemukan. Pastikan backend server berjalan atau file "assets/js/config.js" ada.');
}

async function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (supabaseClientPromise) return supabaseClientPromise;
    supabaseClientPromise = (async () => {
        await loadSupabaseSdk();
        const cfg = await getSupabasePublicConfig();
        
        const client = window.supabase.createClient(cfg.url, cfg.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });

        // Listener Perubahan Auth (Penting untuk menangani Token Expired)
        client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                // Hapus data lokal
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-')) localStorage.removeItem(key);
                });
                
                // PENTING: Jangan redirect jika kita sudah di halaman login/register/landing
                const path = window.location.pathname;
                if (!path.endsWith('login.html') && !path.endsWith('register.html') && !path.endsWith('landing.html') && !path.endsWith('/')) {
                     window.location.href = 'login.html';
                }
            }
        });

        supabaseClient = client;
        supabaseClientPromise = null;
        return client;
    })();
    return supabaseClientPromise;
}

async function isPremiumActive(sb, userId) {
    try {
        if (!sb || !userId) return false;
        const now = new Date();
        const nowIso = now.toISOString();

        // 1. Cek Profil (Sumber Kebenaran Utama)
        try {
            // Pilih SEMUA kolom premium potensial agar aman
            const { data: prof } = await sb.from('profiles')
                .select('plan, is_premium, premium_until, premium_expires_at')
                .eq('id', userId)
                .maybeSingle();
            
            if (prof) {
                // Cek 'premium_expires_at' (Standar)
                if (prof.premium_expires_at && new Date(prof.premium_expires_at) > now) return true;
                
                // Cek 'premium_until' (Legacy/Lama)
                if (prof.premium_until && new Date(prof.premium_until) > now) return true;
                
                // Cek 'plan' atau 'is_premium' (Permanen/Berlangganan)
                const isPlanPremium = (String(prof.plan || '').toLowerCase() === 'premium');
                const isBoolPremium = !!prof.is_premium;
                
                if (isPlanPremium || isBoolPremium) {
                    // Jika plan premium, cek apakah sudah kedaluwarsa (jika tanggal kedaluwarsa ada)
                    // Jika tidak ada tanggal kedaluwarsa, anggap permanen/aktif
                    const expiry = prof.premium_expires_at || prof.premium_until;
                    if (!expiry) return true; 
                    if (new Date(expiry) > now) return true;
                }
            }
        } catch (e) {
            console.warn('Profile check failed in isPremiumActive', e);
        }

        // 2. Cek Pembelian (Sumber Cadangan)
        const { data: purchases, error } = await sb
            .from('premium_purchases')
            .select('expires_at')
            .eq('user_id', userId)
            .eq('status', 'confirmed')
            .gt('expires_at', nowIso) // Hanya ambil yang aktif
            .limit(1);

        if (!error && purchases && purchases.length > 0) return true;

        return false;
    } catch (e) {
        console.error('isPremiumActive Error:', e);
        return false;
    }
}

window.isPremiumActive = isPremiumActive;

async function requireAuthIfNeeded() {
    if (document.body && document.body.dataset && document.body.dataset.page === 'auth') return;
    if (!document.body || !document.body.dataset || document.body.dataset.requireAuth !== 'true') return;

    const sb = await getSupabaseClient();
    const { data } = await sb.auth.getSession();
    if (!data || !data.session) {
        window.location.href = 'login.html';
    }
}
