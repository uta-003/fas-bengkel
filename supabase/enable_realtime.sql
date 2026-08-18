-- =============================================
-- Aktifkan Realtime untuk tabel publik Bengkel FAS
-- Jalankan di Supabase SQL Editor SEKALI SAJA.
-- Setelah itu, data yang diubah dari perangkat mana pun
-- langsung muncul di semua layar yang terbuka (tanpa refresh).
-- =============================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['spareparts', 'suppliers', 'transactions']
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Verifikasi: daftar tabel yang masuk publikasi realtime
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
ORDER BY tablename;
