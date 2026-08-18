-- =============================================
-- Aktifkan RLS Policy untuk Tabel yang Sudah Ada
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- Tambahkan kolom barcode ke tabel transactions (jika belum ada)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Index untuk pencarian barcode
CREATE INDEX IF NOT EXISTS idx_transactions_barcode ON public.transactions (barcode);

-- Policy untuk tabel spareparts
ALTER TABLE public.spareparts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.spareparts;
CREATE POLICY "Allow all operations"
  ON public.spareparts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy untuk tabel suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.suppliers;
CREATE POLICY "Allow all operations"
  ON public.suppliers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy untuk tabel transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.transactions;
CREATE POLICY "Allow all operations"
  ON public.transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);