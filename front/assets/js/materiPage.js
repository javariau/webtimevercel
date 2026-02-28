async function initMateriPage() {
    const pillsContainer = document.getElementById('materiCategoryPills');
    const cardsContainer = document.getElementById('materiCards');
    if (!pillsContainer || !cardsContainer) return;

    const setCardsMessage = (message) => {
        cardsContainer.innerHTML = `<div class="card" style="padding: 18px;">${message}</div>`;
    };

    const safeText = (value) => {
        if (value === null || value === undefined) return '';
        return String(value);
    };

    const getMateriTitle = (row) => safeText(row.title || row.judul || row.name || row.nama || 'Materi');
    const getMateriMeta = (row) => safeText(row.meta || row.bab || row.level || row.jenjang || '');
    const getMateriDesc = (row) => safeText(row.description || row.deskripsi || row.summary || row.ringkasan || row.content || row.konten || '').slice(0, 140);
    const getMateriImage = (row) => safeText(row.thumbnail_url || row.thumbnail || row.image_url || row.image || row.cover_url || '');

    const renderMateriCards = (rows) => {
        const items = Array.isArray(rows) ? rows : [];
        if (items.length === 0) {
            setCardsMessage('Belum ada materi untuk kategori ini.');
            return;
        }

        cardsContainer.innerHTML = items
            .map((row) => {
                const title = getMateriTitle(row);
                const meta = getMateriMeta(row);
                const desc = getMateriDesc(row);
                const img = getMateriImage(row);
                const imgHtml = img
                    ? `<img src="${img}" alt="${title}" class="card-image">`
                    : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(43,92,165,0.10), rgba(43,92,165,0.02));"><i class=\"fas fa-book\" style=\"font-size:28px;color:rgba(31,60,115,0.65)\"></i></div>`;

                const id = row.id;
                const href = id ? `content-detail.html?id=${encodeURIComponent(id)}` : 'content-detail.html';

                return `
                <div class="card" onclick="window.location.href='${href}'">
                    ${imgHtml}
                    <div class="card-body">
                        ${meta ? `<div class="card-meta">${meta}</div>` : `<div class="card-meta">Materi</div>`}
                        <h3 class="card-title">${title}</h3>
                        <p class="card-text">${desc || ''}</p>
                    </div>
                </div>`;
            })
            .join('');
    };

    const loadMateri = async (categoryId) => {
        try {
            setCardsMessage('Memuat materi...');
            const sb = await getSupabaseClient();
            let q = sb
                .from('materi')
                .select('id, category_id, title, subtitle, image_url, summary, created_at')
                .order('created_at', { ascending: false })
                .limit(24);

            if (categoryId) q = q.eq('category_id', categoryId);

            const { data, error } = await q;
            if (error) throw error;
            renderMateriCards(data);
        } catch (e) {
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
        if (error) throw error;

        renderCategoryPills(categories);
        await loadMateri(null);
    } catch (e) {
        pillsContainer.innerHTML = '';
        setCardsMessage('Gagal memuat kategori.');
    }
}
