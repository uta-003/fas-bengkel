-- =============================================
-- Perbaiki FK transactions.sparepart_id → spareparts.id
-- agar ON DELETE CASCADE sesuai supabase/schema.sql.
-- (DB live yang lama dibuat tanpa CASCADE sehingga
--  hapus sparepart bisa meninggalkan transaksi yatim.)
-- Jalankan di Supabase SQL Editor SEKALI SAJA.
-- =============================================

-- 1) Bersihkan transaksi yatim (sparepart_id menunjuk ke barang yang sudah terhapus)
DELETE FROM public.transactions t
WHERE t.sparepart_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.spareparts s WHERE s.id = t.sparepart_id
  );

-- 2) Ganti constraint FK (nama constraint standar Postgres untuk kolom sparepart_id)
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_sparepart_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_sparepart_id_fkey
  FOREIGN KEY (sparepart_id)
  REFERENCES public.spareparts(id)
  ON DELETE CASCADE;

-- Verifikasi
SELECT conname, confdeltype
FROM pg_constraint
WHERE conrelid = 'public.transactions'::regclass
  AND contype = 'f';
-- confdeltype 'c' = CASCADE
