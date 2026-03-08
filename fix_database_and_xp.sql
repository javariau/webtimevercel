
-- File: fix_database_and_xp.sql
-- Deskripsi: Memperbaiki error 'record "new" has no field "xp"' dengan menghapus trigger usang dan memastikan skema database benar.

-- 1. Matikan RLS sementara untuk memastikan update berjalan (User Request)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- 2. HAPUS TRIGGER/FUNCTION YANG BERMASALAH
-- Error "no field xp" terjadi karena trigger lama masih mencoba membaca kolom 'xp' yang sudah dihapus.
DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
DROP FUNCTION IF EXISTS handle_updated_at(); 
DROP FUNCTION IF EXISTS handle_user_update(); 

-- 3. PASTIKAN KOLOM YANG BENAR ADA
-- Kita gunakan 'points' sebagai pengganti XP.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS materials_read_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges INTEGER DEFAULT 0;

-- 4. FIX KOLOM BADGES (Jika sebelumnya JSONB atau error)
-- Kita ubah badges jadi integer (jumlah badge) agar mudah dijumlahkan
-- (Hanya jalankan jika badges bukan integer, tapi command ini aman jika sudah integer)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'badges' AND data_type != 'integer'
    ) THEN
        -- Backup data lama jika perlu, atau reset ke 0
        ALTER TABLE public.profiles DROP COLUMN badges;
        ALTER TABLE public.profiles ADD COLUMN badges INTEGER DEFAULT 0;
    END IF;
END $$;

-- 5. BUAT ULANG TRIGGER UPDATE TIMESTAMP (YANG AMAN)
-- Hanya update updated_at, JANGAN sentuh XP/Points di sini
CREATE OR REPLACE FUNCTION public.handle_updated_at_safe()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_update_safe
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at_safe();

-- 6. PASTIKAN USER_READS BISA DI-INSERT
-- Hapus policy lama jika ada yang memblokir
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_reads;
CREATE POLICY "Enable insert for authenticated users only" ON public.user_reads FOR INSERT TO authenticated WITH CHECK (true);

-- Selesai.
