// Logika Favorit (Simpan Materi)

async function toggleFavorite() {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;

    try {
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();

        if (!user) {
            if (window.showCustomAlert) {
                window.showCustomAlert('info', 'Login Diperlukan', 'Silakan login untuk menyimpan materi.');
            } else {
                alert('Silakan login untuk menyimpan materi.');
            }
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const materiId = urlParams.get('id');

        if (!materiId) return;

        // Cek apakah sudah disimpan
        const { data: existing, error: checkErr } = await sb
            .from('user_favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('materi_id', materiId)
            .maybeSingle();

        if (existing) {
            // Hapus dari favorit
            const { error: delErr } = await sb
                .from('user_favorites')
                .delete()
                .eq('id', existing.id);
            
            if (!delErr) {
                updateFavoriteBtn(false);
                if (window.showCustomAlert) window.showCustomAlert('success', 'Dihapus', 'Materi dihapus dari daftar simpan.');
            }
        } else {
            // Tambahkan ke favorit
            const { error: insErr } = await sb
                .from('user_favorites')
                .insert([{ user_id: user.id, materi_id: materiId }]);
            
            if (!insErr) {
                updateFavoriteBtn(true);
                if (window.showCustomAlert) window.showCustomAlert('success', 'Disimpan', 'Materi berhasil disimpan!');
            }
        }

    } catch (e) {
        console.error('Error toggle favorit:', e);
    }
}

function updateFavoriteBtn(isSaved) {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;

    if (isSaved) {
        btn.innerHTML = '<i class="fas fa-bookmark"></i> Tersimpan';
        btn.classList.add('active'); // Opsional: tambahkan CSS untuk status aktif
        btn.style.background = '#e0e0e0';
        btn.style.color = '#333';
    } else {
        btn.innerHTML = '<i class="far fa-bookmark"></i> Simpan';
        btn.classList.remove('active');
        btn.style.background = ''; // Reset ke default
        btn.style.color = '';
    }
}

async function checkFavoriteStatus() {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;

    try {
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        const urlParams = new URLSearchParams(window.location.search);
        const materiId = urlParams.get('id');
        if (!materiId) return;

        const { data: existing } = await sb
            .from('user_favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('materi_id', materiId)
            .maybeSingle();

        updateFavoriteBtn(!!existing);

        // Pasang Event Click
        btn.onclick = toggleFavorite;

    } catch (e) {
        console.error('Error cek status favorit:', e);
    }
}

// Inisialisasi otomatis di halaman detail
if (window.location.pathname.includes('content-detail.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        // Tunggu sebentar agar skrip lain siap
        setTimeout(checkFavoriteStatus, 500);
    });
}
