function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatRelativeTime(iso) {
    try {
        const d = new Date(iso);
        const diffMs = Date.now() - d.getTime();
        const sec = Math.floor(diffMs / 1000);
        if (sec < 60) return 'Baru saja';
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min} menit yang lalu`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr} jam yang lalu`;
        const day = Math.floor(hr / 24);
        return `${day} hari yang lalu`;
    } catch (e) {
        return '';
    }
}

function pageTitleIncludes(text) {
    const title = document.querySelector('.section-title');
    if (!title) return false;
    return String(title.textContent || '').toLowerCase().includes(String(text || '').toLowerCase());
}

function setPlaceholderMessage(container, title, message) {
    if (!container) return;
    container.innerHTML = `<div class="card" style="padding: 18px;"><h3 class="card-title">${escapeHtml(title)}</h3><p class="card-text">${escapeHtml(message)}</p></div>`;
}

async function initQuizzesPage() {
    if (!pageTitleIncludes('kuis')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('quizzes')
            .select('id, title, image_url, question_count, duration, rating, created_at')
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat kuis', 'Periksa RLS policy / koneksi Supabase.');
            return;
        }

        const quizzes = Array.isArray(data) ? data : [];
        if (quizzes.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada kuis', 'Tambahkan data di tabel quizzes untuk menampilkan daftar kuis.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = quizzes
            .map((q) => {
                const title = escapeHtml(q.title || 'Kuis');
                const img = (q.image_url || '').trim();
                const qc = typeof q.question_count === 'number' ? q.question_count : 0;
                const duration = escapeHtml(q.duration || '');
                const rating = q.rating != null ? String(q.rating) : '';
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-circle-question\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                const meta = qc > 0 ? `${qc} soal` : 'Kuis';
                const footerRight = duration || rating ? `${duration}${duration && rating ? ' • ' : ''}${rating ? `⭐ ${escapeHtml(rating)}` : ''}` : 'Mulai';
                return `
                <div class="card" onclick="window.location.href='quiz-detail.html?id=${encodeURIComponent(q.id)}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(meta)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">Uji pemahamanmu dengan kuis interaktif.</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag"><i class="fas fa-list" style="margin-right: 5px;"></i> ${escapeHtml(meta)}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">${footerRight} <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat kuis', 'Terjadi error di browser.');
    }
}

async function initCommunityPage() {
    if (!pageTitleIncludes('komunitas')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('chat_rooms')
            .select('id, title, description, avatar_url, last_message, last_message_time, is_premium, created_at')
            .order('last_message_time', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat komunitas', 'Periksa RLS policy / koneksi Supabase.');
            return;
        }

        const rooms = Array.isArray(data) ? data : [];
        if (rooms.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada room', 'Tambahkan data di tabel chat_rooms untuk menampilkan komunitas.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = rooms
            .map((r) => {
                const title = escapeHtml(r.title || 'Room');
                const desc = escapeHtml((r.description || r.last_message || '').slice(0, 120));
                const img = (r.avatar_url || '').trim();
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-comments\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                const tag = r.is_premium ? 'Premium' : 'Community';
                const time = r.last_message_time ? formatRelativeTime(r.last_message_time) : '';
                return `
                <div class="card" onclick="window.location.href='chat-room.html?id=${encodeURIComponent(r.id)}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(tag)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">${escapeHtml(time || 'Buka room')}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Masuk <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat komunitas', 'Terjadi error di browser.');
    }
}

async function initTasksPage() {
    if (!pageTitleIncludes('tugas')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data: sessionData } = await sb.auth.getSession();
        const user = sessionData && sessionData.session ? sessionData.session.user : null;

        if (!user) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Login diperlukan', 'Silakan login untuk melihat progres tugas kamu.');
            return;
        }

        const { data, error } = await sb
            .from('user_tasks')
            .select('id, current_progress, is_completed, last_updated_at, task:tasks(id, title, description, type, target_count, points_reward, is_daily)')
            .eq('user_id', user.id)
            .order('is_completed', { ascending: true })
            .order('last_updated_at', { ascending: false })
            .limit(50);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat tugas', 'Periksa RLS policy tabel tasks/user_tasks.');
            return;
        }

        const rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
            const { data: masterTasks, error: masterErr } = await sb
                .from('tasks')
                .select('id, title, description, type, target_count, points_reward, is_daily, created_at')
                .order('created_at', { ascending: false })
                .limit(20);

            if (masterErr) {
                setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada tugas', 'Tambahkan data di tabel tasks / user_tasks untuk menampilkan tugas.');
                return;
            }

            const tasks = Array.isArray(masterTasks) ? masterTasks : [];
            if (tasks.length === 0) {
                setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada tugas', 'Tambahkan data di tabel tasks untuk menampilkan tugas.');
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'cards-grid';
            grid.innerHTML = tasks
                .map((t) => {
                    const title = escapeHtml(t.title || 'Tugas');
                    const desc = escapeHtml((t.description || '').slice(0, 120));
                    const reward = typeof t.points_reward === 'number' ? t.points_reward : 0;
                    const target = typeof t.target_count === 'number' ? t.target_count : 1;
                    const tag = t.is_daily ? 'Harian' : 'Sekali';
                    return `
                    <div class="card">
                        <div class="card-body">
                            <div class="card-meta">${escapeHtml(tag)}</div>
                            <h3 class="card-title">${title}</h3>
                            <p class="card-text">${desc}</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-tag">Target ${escapeHtml(String(target))}</span>
                            <span style="color: var(--primary); font-size: 13px; font-weight: 600;">+${escapeHtml(String(reward))} XP</span>
                        </div>
                    </div>`;
                })
                .join('');
            placeholderCard.replaceWith(grid);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = rows
            .map((row) => {
                const t = row.task || {};
                const title = escapeHtml(t.title || 'Tugas');
                const desc = escapeHtml((t.description || '').slice(0, 120));
                const reward = typeof t.points_reward === 'number' ? t.points_reward : 0;
                const target = typeof t.target_count === 'number' ? t.target_count : 1;
                const progress = typeof row.current_progress === 'number' ? row.current_progress : 0;
                const pct = Math.max(0, Math.min(100, Math.round((progress / Math.max(1, target)) * 100)));
                const status = row.is_completed ? 'Selesai' : `Progress ${progress}/${target}`;
                return `
                <div class="card">
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(status)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                        <div style="margin-top: 10px; height: 8px; background: rgba(31, 60, 115, 0.12); border-radius: 999px; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: var(--primary);"></div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">${escapeHtml(String(pct))}%</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">+${escapeHtml(String(reward))} XP</span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat tugas', 'Terjadi error di browser.');
    }
}

async function initPremiumPage() {
    if (!pageTitleIncludes('premium')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('premium_packages')
            .select('id, title, description, price, duration_days, created_at')
            .order('price', { ascending: true })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat paket premium', 'Periksa RLS policy tabel premium_packages.');
            return;
        }

        const packs = Array.isArray(data) ? data : [];
        if (packs.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada paket', 'Tambahkan data di tabel premium_packages untuk menampilkan paket.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = packs
            .map((p) => {
                const title = escapeHtml(p.title || 'Premium');
                const desc = escapeHtml((p.description || '').slice(0, 120));
                const price = p.price != null ? String(p.price) : '0';
                const days = typeof p.duration_days === 'number' ? p.duration_days : 30;
                return `
                <div class="card">
                    <div class="card-body">
                        <div class="card-meta">${escapeHtml(`${days} hari`)}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc || 'Akses fitur premium dan konten eksklusif.'}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">Rp ${escapeHtml(price)}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Pilih <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat paket premium', 'Terjadi error di browser.');
    }
}

async function initShopPage() {
    if (!pageTitleIncludes('toko')) return;

    const wrapper = document.querySelector('.content-wrapper');
    if (!wrapper) return;
    const placeholderCard = wrapper.querySelector('.card');
    if (!placeholderCard) return;

    try {
        const sb = await getSupabaseClient();
        const { data, error } = await sb
            .from('products')
            .select('id, name, description, price, stock, image_url, sold_count, created_at')
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat produk', 'Periksa RLS policy tabel products.');
            return;
        }

        const products = Array.isArray(data) ? data : [];
        if (products.length === 0) {
            setPlaceholderMessage(placeholderCard.parentElement, 'Belum ada produk', 'Tambahkan data di tabel products untuk menampilkan produk.');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        grid.innerHTML = products
            .map((p) => {
                const title = escapeHtml(p.name || 'Produk');
                const desc = escapeHtml((p.description || '').slice(0, 110));
                const img = (p.image_url || '').trim();
                const price = p.price != null ? String(p.price) : '';
                const stock = typeof p.stock === 'number' ? p.stock : 0;
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-store\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                return `
                <div class="card">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">Stok ${escapeHtml(String(stock))}</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">${price ? `Rp ${escapeHtml(price)}` : 'Reward'}</span>
                        <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Beli <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            })
            .join('');

        placeholderCard.replaceWith(grid);
    } catch (e) {
        setPlaceholderMessage(placeholderCard.parentElement, 'Gagal memuat produk', 'Terjadi error di browser.');
    }
}

async function initTokohPage() {
    const sectionTitle = document.querySelector('.section-title');
    if (!sectionTitle) return;
    if (!String(sectionTitle.textContent || '').toLowerCase().includes('tokoh')) return;

    const grid = document.querySelector('.stories-grid');
    if (!grid) return;

    try {
        const sb = await getSupabaseClient();

        const { data: categories, error: catErr } = await sb
            .from('categories')
            .select('id, name')
            .ilike('name', '%tokoh%')
            .limit(1);

        if (catErr) return;
        const cat = Array.isArray(categories) && categories[0] ? categories[0] : null;
        if (!cat) return;

        const { data: materi, error } = await sb
            .from('materi')
            .select('id, title, subtitle, image_url, summary, created_at')
            .eq('category_id', cat.id)
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) return;
        const items = Array.isArray(materi) ? materi : [];
        if (items.length === 0) return;

        grid.innerHTML = items
            .map((m) => {
                const title = escapeHtml(m.title || 'Tokoh');
                const role = escapeHtml(m.subtitle || (m.summary || '').slice(0, 60));
                const img = (m.image_url || '').trim();
                const imgTag = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}">`
                    : `<div style="height: 170px; display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-users\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                return `
                <div class="story-card" onclick="window.location.href='content-detail.html?id=${encodeURIComponent(m.id)}'">
                    <div class="story-image-wrapper">
                        ${imgTag}
                    </div>
                    <div class="story-body">
                        <div class="story-title">${title}</div>
                        <div class="story-role">${role}</div>
                    </div>
                </div>`;
            })
            .join('');
    } catch (e) {
        // ignore
    }
}

async function loadCurrentProfile() {
    const sb = await getSupabaseClient();
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData && sessionData.session ? sessionData.session.user : null;
    if (!user) return { user: null, profile: null };

    const { data: profile } = await sb.from('profiles').select('id, full_name, username, avatar_url, points, level, created_at').eq('id', user.id).maybeSingle();
    return { user, profile: profile || null };
}

async function initCommonUser() {
    try {
        const { user, profile } = await loadCurrentProfile();
        if (profile) {
            updateCommonUserUI(profile);
            return;
        }

        if (user && user.user_metadata) {
            const meta = user.user_metadata || {};
            updateCommonUserUI({
                full_name: meta.full_name || '',
                username: meta.username || '',
                avatar_url: meta.avatar_url || '',
            });
        }
    } catch (e) {
        // ignore
    }
}

function updateCommonUserUI(profile) {
    if (!profile) return;

    const name = (profile.full_name || profile.username || 'Pengguna').trim();
    const avatarUrl = (profile.avatar_url || '').trim();

    document.querySelectorAll('.user-name').forEach((el) => {
        el.textContent = name;
    });

    if (avatarUrl) {
        document.querySelectorAll('img.user-avatar').forEach((img) => {
            img.src = avatarUrl;
        });
        document.querySelectorAll('img.profile-avatar-large').forEach((img) => {
            img.src = avatarUrl;
        });
    }

    const profileNameLarge = document.querySelector('.profile-name-large');
    if (profileNameLarge) profileNameLarge.textContent = name;
}

async function initDashboardPage() {
    const heroTitle = document.querySelector('.hero-section .hero-content h1');
    const heroStats = document.querySelectorAll('.hero-section .hero-stats .stat-value');
    const continueCardsGrid = document.querySelector('#dashboardPage .cards-grid');
    if (!heroTitle && !continueCardsGrid) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);

        if (heroTitle) {
            const displayName = profile && (profile.full_name || profile.username) ? (profile.full_name || profile.username) : 'Pengguna';
            heroTitle.textContent = `Selamat Datang, ${displayName}! 👋`;
        }

        if (heroStats && heroStats.length >= 3) {
            let materiSelesai = 0;
            let badgeCount = 0;
            let xp = profile && typeof profile.points === 'number' ? profile.points : 0;

            if (user) {
                const { count: readCount } = await sb
                    .from('daily_materi_reads')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                materiSelesai = readCount || 0;

                const { count: quizCount } = await sb
                    .from('quiz_attempts')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                badgeCount = quizCount || 0;
            }

            heroStats[0].textContent = String(materiSelesai);
            heroStats[1].textContent = String(badgeCount);
            heroStats[2].textContent = String(xp);
        }

        if (continueCardsGrid) {
            const response = await fetch('/api/materi');
            if (!response.ok) return;
            const materi = await response.json();
            const items = Array.isArray(materi) ? materi : [];
            continueCardsGrid.innerHTML = items
                .map((m) => {
                    const title = escapeHtml(m.title || 'Materi');
                    const desc = escapeHtml((m.summary || '').slice(0, 120));
                    const img = (m.image_url || '').trim();
                    const imgHtml = img
                        ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                        : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-book\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                    const href = `content-detail.html?id=${encodeURIComponent(m.id)}`;
                    return `
                    <div class="card" onclick="window.location.href='${href}'">
                        ${imgHtml}
                        <div class="card-body">
                            <div class="card-meta">Materi</div>
                            <h3 class="card-title">${title}</h3>
                            <p class="card-text">${desc}</p>
                        </div>
                        <div class="card-footer">
                            <span class="card-tag"><i class="fas fa-clock" style="margin-right: 5px;"></i> 10 menit</span>
                            <span style="color: var(--primary); font-size: 13px; font-weight: 600;">Mulai <i class="fas fa-arrow-right"></i></span>
                        </div>
                    </div>`;
                })
                .join('');
        }
    } catch (e) {
        // ignore
    }
}

async function initSavedPage() {
    const title = document.querySelector('.section-title');
    const grid = document.querySelector('.cards-grid');
    if (!title || !grid) return;
    if (!String(title.textContent || '').includes('Tersimpan')) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);
        if (!user) {
            grid.innerHTML = `<div class="card" style="padding: 18px;">Silakan login untuk melihat materi tersimpan.</div>`;
            return;
        }

        const { data, error } = await sb
            .from('user_favorites')
            .select('created_at, materi:materi_id (id, title, summary, image_url)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(24);

        if (error) {
            grid.innerHTML = `<div class="card" style="padding: 18px;">Gagal memuat materi tersimpan.</div>`;
            return;
        }

        const rows = Array.isArray(data) ? data : [];
        if (rows.length === 0) {
            grid.innerHTML = `<div class="card" style="padding: 18px;">Belum ada materi tersimpan.</div>`;
            return;
        }

        grid.innerHTML = rows
            .map((row) => {
                const m = row.materi || {};
                const title = escapeHtml(m.title || 'Materi');
                const desc = escapeHtml((m.summary || '').slice(0, 120));
                const img = (m.image_url || '').trim();
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-book\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;
                const savedAt = formatRelativeTime(row.created_at);
                const href = m.id ? `content-detail.html?id=${encodeURIComponent(m.id)}` : 'content-detail.html';

                return `
                <div class="card" onclick="window.location.href='${href}'">
                    ${imgHtml}
                    <div class="card-body">
                        <div class="card-meta">Materi</div>
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-tag">Tersimpan ${escapeHtml(savedAt)}</span>
                        <i class="fas fa-bookmark" style="color: var(--primary);"></i>
                    </div>
                </div>`;
            })
            .join('');
    } catch (e) {
        // ignore
    }
}

async function initNotificationPage() {
    const layout = document.querySelector('.notification-layout');
    const generalList = document.getElementById('generalNotif');
    if (!layout || !generalList) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);
        if (!user) return;

        const { data, error } = await sb
            .from('notifications')
            .select('id, type, title, message, created_at, is_read, badge_count')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) return;

        const items = Array.isArray(data) ? data : [];
        if (items.length === 0) {
            generalList.innerHTML = `<div class="notification-item"><div class="notification-content"><h4>Tidak ada notifikasi</h4><p>Notifikasi kamu akan muncul di sini.</p></div></div>`;
            return;
        }

        const iconByType = (t) => {
            const type = String(t || '').toLowerCase();
            if (type.includes('materi')) return { cls: 'blue', icon: '📖' };
            if (type.includes('quiz')) return { cls: 'orange', icon: '🎯' };
            if (type.includes('premium')) return { cls: 'purple', icon: '👑' };
            if (type.includes('chat')) return { cls: 'green', icon: '💬' };
            return { cls: 'green', icon: '📌' };
        };

        generalList.innerHTML = items
            .map((n) => {
                const { cls, icon } = iconByType(n.type);
                const title = escapeHtml(n.title || 'Notifikasi');
                const msg = escapeHtml(n.message || '');
                const time = escapeHtml(formatRelativeTime(n.created_at));
                return `
                <div class="notification-item">
                    <div class="notification-icon ${cls}">${icon}</div>
                    <div class="notification-content">
                        <h4>${title}</h4>
                        <p>${msg}</p>
                        <div class="notification-time">${time}</div>
                    </div>
                </div>`;
            })
            .join('');
    } catch (e) {
        // ignore
    }
}

async function initProfilePage() {
    const profileHeader = document.querySelector('.profile-header-card');
    if (!profileHeader) return;

    try {
        const sb = await getSupabaseClient();
        const { user, profile } = await loadCurrentProfile();
        if (profile) updateCommonUserUI(profile);
        if (!user || !profile) return;

        const statsValues = document.querySelectorAll('.profile-stats .profile-stat-value');
        if (statsValues && statsValues.length >= 3) {
            const { count: favCount } = await sb
                .from('user_favorites')
                .select('materi_id', { count: 'exact', head: true })
                .eq('user_id', user.id);

            statsValues[0].textContent = String(favCount || 0);
            statsValues[1].textContent = String(profile.level || 1);
            statsValues[2].textContent = String(profile.points || 0);
        }

        const savedMenu = Array.from(document.querySelectorAll('.menu-item-content p')).find((p) => String(p.textContent || '').includes('materi tersimpan'));
        if (savedMenu) {
            const { count: favCount } = await sb
                .from('user_favorites')
                .select('materi_id', { count: 'exact', head: true })
                .eq('user_id', user.id);
            savedMenu.textContent = `${favCount || 0} materi tersimpan`;
        }
    } catch (e) {
        // ignore
    }
}

function initDataPages() {
    initCommonUser();
    initDashboardPage();
    initSavedPage();
    initNotificationPage();
    initProfilePage();
    initQuizzesPage();
    initCommunityPage();
    initTasksPage();
    initPremiumPage();
    initShopPage();
    initTokohPage();
}
