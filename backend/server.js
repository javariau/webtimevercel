const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.vnv') });
const express = require('express');

const app = express();
const PORT = process.env.PORT || 7979;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const frontDir = path.resolve(__dirname, '..', 'front');

app.use(express.static(frontDir));

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

async function supabaseRestRequest(resourcePath) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${resourcePath}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Supabase error ${res.status}: ${message}`);
  }

  return res.json();
}

app.get('/api/categories', async (_req, res) => {
  if (!hasSupabaseConfig()) {
    return res.status(500).json({ error: 'SUPABASE_URL dan SUPABASE_ANON_KEY (atau SUPABASE_SERVICE_ROLE_KEY) belum diset.' });
  }

  try {
    const data = await supabaseRestRequest('categories?select=id,name&order=name.asc');
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil kategori dari Supabase.' });
  }
});

app.get('/api/materi', async (req, res) => {
  if (!hasSupabaseConfig()) {
    return res.status(500).json({ error: 'SUPABASE_URL dan SUPABASE_ANON_KEY (atau SUPABASE_SERVICE_ROLE_KEY) belum diset.' });
  }

  try {
    const categoryId = String(req.query.category_id || '').trim();
    const baseQuery = 'select=*&order=created_at.desc&limit=24';
    const query = categoryId
      ? `materi?${baseQuery}&category_id=eq.${encodeURIComponent(categoryId)}`
      : `materi?${baseQuery}`;

    const data = await supabaseRestRequest(query);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil materi dari Supabase.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(frontDir, 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
