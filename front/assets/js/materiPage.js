async function initMateriPageV2() {
    // console.log('initMateriPageV2 STARTED'); // Debug log
    const pillsContainer = document.getElementById('materiCategoryPills');
    const cardsContainer = document.getElementById('materiCards');
    if (!pillsContainer || !cardsContainer) return;

    const urlParams = new URLSearchParams(window.location.search || '');
    const searchQuery = String(urlParams.get('q') || '').trim().toLowerCase();

    const headerSearchInput = document.querySelector('.top-header .search-bar input');
    if (headerSearchInput && searchQuery) {
        headerSearchInput.value = searchQuery;
    }

    const setCardsMessage = (message) => {
        cardsContainer.innerHTML = `<div class="card" style="padding: 18px;">${message}</div>`;
    };

    const safeText = (value) => {
        if (value === null || value === undefined) return '';
        return String(value);
    };

    const stripHtml = (html) => {
        if (!html) return '';
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const renderMateriCards = (rows, readMateriIds = new Set()) => {
        const items = Array.isArray(rows) ? rows : [];
        const cardsContainer = document.getElementById('materiCards');
        if (!items.length) {
            cardsContainer.innerHTML = `<div class="card" style="padding: 18px;">Belum ada materi untuk kategori ini.</div>`;
            return;
        }

        cardsContainer.innerHTML = items.map((row) => {
            const title = row.title || row.judul || row.name || 'Materi';
            const meta = row.subtitle || row.meta || row.bab || '';
            // Hapus HTML dari deskripsi untuk memastikan line-clamp berfungsi dengan benar
            const rawDesc = row.summary || row.description || row.content || '';
            const desc = stripHtml(rawDesc);
            
            const img = row.image_url || row.thumbnail_url || 'assets/img/placeholder.jpg';
            const href = `content-detail.html?id=${row.id}`;
            const isRead = readMateriIds.has(row.id);
            const checkMark = isRead ? '<div style="position:absolute;top:10px;right:10px;background:#28a745;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.2);z-index:5;"><i class="fas fa-check" style="font-size:12px;"></i></div>' : '';

            return `
            <div class="card" onclick="window.location.href='${href}'" style="cursor: pointer; transition: transform 0.2s; display: flex; flex-direction: column; height: 100%;">
                <div class="card-image-wrapper" style="width: 100%; height: 180px; position: relative;">
                    <img src="${img}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover;">
                    ${checkMark}
                </div>
                <div class="card-body" style="padding: 16px; flex: 1; display: flex; flex-direction: column;">
                    <div class="card-meta" style="font-size: 12px; color: var(--primary); font-weight: 600; margin-bottom: 8px;">${meta || 'Materi Sejarah'}</div>
                    <h3 class="card-title" style="font-size: 16px; margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.8em;">${title}</h3>
                    <div class="card-text" style="font-size: 13px; color: var(--text-light); line-height: 1.5; margin-bottom: 8px; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 39px;">${desc}</div>
                    <span class="card-read-more" style="font-size: 12px; font-weight: 700; color: #d4af37; margin-top: auto;">
                        ${isRead ? '<span style="color:#28a745;"><i class="fas fa-check-double"></i> Selesai Dibaca</span>' : 'Baca Selengkapnya <i class="fas fa-arrow-right"></i>'}
                    </span>
                </div>
            </div>`;
        }).join('');
    };

    const loadMateri = async (categoryId) => {
        try {
            setCardsMessage('Memuat materi...');
            const sb = await getSupabaseClient();

            let isPremium = false;
            let readMateriIds = new Set();
            
            try {
                const { data: sessionData } = await sb.auth.getSession();
                const user = sessionData && sessionData.session ? sessionData.session.user : null;
                
                if (user) {
                    // Gunakan fungsi sentralisasi isPremiumActive agar konsisten
                    if (typeof window.isPremiumActive === 'function') {
                        isPremium = await window.isPremiumActive(sb, user.id);
                    } else {
                        // Fallback jika fungsi belum siap (jarang terjadi)
                        console.warn('isPremiumActive not found, using fallback logic');
                        const { data: profile } = await sb.from('profiles').select('plan, is_premium, premium_until, premium_expires_at').eq('id', user.id).single();
                        if (profile) {
                            const isPremiumBool = !!profile.is_premium;
                            const planPremium = (profile.plan === 'premium');
                            const expiryStr = profile.premium_until || profile.premium_expires_at;
                            const notExpired = expiryStr ? new Date(expiryStr) > new Date() : true; 
                            isPremium = (isPremiumBool || planPremium) && notExpired;
                        }
                    }

                    // Ambil Riwayat Bacaan
                    // Gunakan 'user_reads' agar konsisten dengan dataPages.js
                    const { data: readLogs } = await sb
                        .from('user_reads')
                        .select('material_id')
                        .eq('user_id', user.id);
                    
                    if (readLogs) {
                        readLogs.forEach(log => readMateriIds.add(log.material_id));
                    }
                }
            } catch (e) {
                console.error('Premium Check Error:', e);
                isPremium = false;
            }

            let q = sb
                .from('materi')
                .select('id, category_id, title, subtitle, image_url, summary, created_at')
                .order('created_at', { ascending: false });

            if (categoryId) q = q.eq('category_id', categoryId);

            const { data, error } = await q;
            if (error) throw error;

            let rows = Array.isArray(data) ? data : [];
            if (searchQuery) {
                rows = rows.filter((r) => {
                    const hay = `${safeText(r.title)} ${safeText(r.summary)} ${safeText(r.subtitle)}`.toLowerCase();
                    return hay.includes(searchQuery);
                });
            }

            // Logika Premium vs Gratis
            if (isPremium) {
                renderMateriCards(rows, readMateriIds);
            } else {
                const freeCount = 6;
                const visible = rows.slice(0, freeCount);
                renderMateriCards(visible, readMateriIds);
                
                if (rows.length > freeCount) {
                    const lockCard = document.createElement('div');
                    lockCard.className = 'card';
                    lockCard.style.cssText = 'background: #f8f9fa; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; border: 2px dashed #ccc; cursor: pointer; min-height: 380px;';
                    lockCard.onclick = () => window.location.href = 'premium.html';
                    lockCard.innerHTML = `
                        <div style="font-size: 48px; margin-bottom: 15px; color: var(--text-light);">🔒</div>
                        <h3 style="font-size: 18px; margin-bottom: 8px;">Konten Premium</h3>
                        <p style="font-size: 14px; color: var(--text-light); margin-bottom: 20px; line-height: 1.5;">
                            Terdapat <b>${rows.length - freeCount}</b> materi tambahan yang terkunci.<br>
                            Upgrade akun Anda untuk membuka semua akses.
                        </p>
                        <button class="btn-primary" style="padding: 10px 20px; font-size: 14px; border-radius: 50px;">
                            <i class="fas fa-crown"></i> Buka Akses Premium
                        </button>
                    `;
                    cardsContainer.appendChild(lockCard);
                }
            }
        } catch (e) {
            console.error('Materi load error:', e);
            setCardsMessage('Gagal memuat materi.');
        }
    };

    const renderCategoryPills = (categories) => {
        const items = Array.isArray(categories) ? categories : [];
        const allBtn = document.createElement('button');
        allBtn.className = 'pill active';
        allBtn.type = 'button';
        allBtn.textContent = 'Semua';
        allBtn.addEventListener('click', () => {
            pillsContainer.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
            allBtn.classList.add('active');
            loadMateri(null);
        });
        pillsContainer.appendChild(allBtn);

        items.forEach((cat) => {
            const btn = document.createElement('button');
            btn.className = 'pill';
            btn.type = 'button';
            btn.textContent = safeText(cat.name || cat.nama || 'Kategori');
            btn.addEventListener('click', () => {
                pillsContainer.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
                btn.classList.add('active');
                loadMateri(cat.id);
            });
            pillsContainer.appendChild(btn);
        });
    };

    try {
        pillsContainer.innerHTML = '';
        const sb = await getSupabaseClient();
        const { data: categories, error } = await sb
            .from('categories')
            .select('id, name')
            .order('name', { ascending: true });
        
        if (error) {
            console.error('Category fetch error:', error);
            throw error;
        }

        renderCategoryPills(categories);
        await loadMateri(null);
    } catch (e) {
        console.error('Init Materi Page Error:', e);
        pillsContainer.innerHTML = '';
        setCardsMessage('Gagal memuat kategori. Pastikan Anda terhubung ke internet.');
    }
}

async function initMateriDetailPage() {
    const titleEl = document.getElementById('contentTitle');
    const imageEl = document.getElementById('contentImage');
    const bodyEl = document.getElementById('contentBody');
    const videoContainer = document.getElementById('contentVideoContainer');
    const videoFrame = document.getElementById('contentVideoFrame');
    const dateEl = document.getElementById('contentMetaDate');

    if (!titleEl || !bodyEl) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');

        if (!id) {
            bodyEl.innerHTML = '<p>ID materi tidak ditemukan.</p>';
            return;
        }

        const sb = await getSupabaseClient();
        const { data: materi, error } = await sb
            .from('materi')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !materi) {
            bodyEl.innerHTML = '<p>Materi tidak ditemukan atau telah dihapus.</p>';
            return;
        }

        // Isi Data
        titleEl.textContent = materi.title || 'Tanpa Judul';
        
        if (imageEl) {
            imageEl.src = materi.image_url || 'assets/img/placeholder.jpg';
            imageEl.alt = materi.title;
        }

        if (dateEl && materi.created_at) {
            const date = new Date(materi.created_at);
            dateEl.textContent = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        const sbClient = await getSupabaseClient();
        const { data: sessionData } = await sbClient.auth.getSession();
        const sessUser = sessionData && sessionData.session ? sessionData.session.user : null;
        const isPremium = sessUser ? await isPremiumActive(sbClient, sessUser.id) : false;

        if (videoContainer) {
            if (materi.video_url) {
                if (isPremium) {
                    // Tampilkan Video untuk Pengguna Premium
                    let embedUrl = materi.video_url;
                    // Konverter sederhana untuk URL tonton YouTube ke embed
                    if (embedUrl.includes('youtube.com/watch?v=')) {
                        const videoId = embedUrl.split('v=')[1].split('&')[0];
                        embedUrl = `https://www.youtube.com/embed/${videoId}`;
                    } else if (embedUrl.includes('youtu.be/')) {
                        const videoId = embedUrl.split('youtu.be/')[1].split('?')[0];
                        embedUrl = `https://www.youtube.com/embed/${videoId}`;
                    }
                    
                    if (videoFrame) videoFrame.src = embedUrl;
                    videoContainer.style.display = 'block';
                } else {
                    videoContainer.style.display = 'block';
                    const ret = encodeURIComponent(window.location.href);
                    videoContainer.innerHTML = `<div style="background:#2c1a15;color:#fff;padding:40px 20px;text-align:center;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:315px;">
                        <i class="fas fa-lock" style="font-size:48px;color:#FFD700;margin-bottom:15px;"></i>
                        <h3 style="margin:0 0 10px 0;">Video Eksklusif Premium</h3>
                        <p style="margin:0 0 20px 0;font-size:14px;opacity:.9;">Upgrade ke akun Premium untuk menonton video pembelajaran ini.</p>
                        <a href="premium.html?return=${ret}" style="background:linear-gradient(135deg,#FFD700 0%,#B8860B 100%);border:none;padding:10px 24px;border-radius:20px;font-weight:700;color:#2c1a15;cursor:pointer;text-decoration:none;display:inline-block;">Buka Kunci <i class="fas fa-crown"></i></a>
                    </div>`;
                }
            } else {
                videoContainer.style.display = 'none';
            }
        }

        // Tangani Konten & Ilustrasi
        // Prioritaskan 'content' jika ada (untuk masa depan), gunakan 'summary' sebagai cadangan
        const content = materi.content || materi.summary || '<p>Belum ada deskripsi materi.</p>';
        let formattedContent = '';

        // Konversi baris baru menjadi paragraf jika teks biasa
        if (!content.includes('<p>')) {
            formattedContent = content.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('');
        } else {
            formattedContent = content;
        }

        // Sisipkan Gambar Ilustrasi setelah paragraf pertama jika konten cukup panjang
        if (formattedContent.includes('</p>')) {
            // Ilustrasi default (cadangan)
            let illustrationUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Aristotle_Altemps_Inv8575.jpg/440px-Aristotle_Altemps_Inv8575.jpg';
            
            // Pemetaan ilustrasi kustom berdasarkan judul (sementara sampai DB memiliki illustration_url)
            if (materi.title && materi.title.toLowerCase().includes('orde baru')) {
                illustrationUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Suharto_1993.jpg'; // Gambar Soeharto
            } else if (materi.title && materi.title.toLowerCase().includes('proklamasi')) {
                illustrationUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Soekarno_reading_proclamation_of_independence.jpg/640px-Soekarno_reading_proclamation_of_independence.jpg';
            }

            // Buat HTML ilustrasi
            const illustrationHtml = `
                <div class="content-illustration" style="margin: 25px 0; text-align: center;">
                    <img src="${materi.illustration_url || illustrationUrl}" alt="Ilustrasi ${materi.title}" style="width: 100%; max-width: 600px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <span style="display: block; font-size: 13px; color: var(--text-light); margin-top: 8px; font-style: italic;">Ilustrasi: ${materi.title}</span>
                </div>
            `;

            // Sisipkan setelah paragraf pertama
            formattedContent = formattedContent.replace('</p>', `</p>${illustrationHtml}`);
        }

        bodyEl.innerHTML = formattedContent;

    } catch (e) {
        console.error('Gagal memuat detail:', e);
        bodyEl.innerHTML = '<p>Terjadi kesalahan saat memuat materi.</p>';
    }
}

// Ekspos ke window agar app.js bisa memanggilnya
window.initMateriDetailPage = initMateriDetailPage;
