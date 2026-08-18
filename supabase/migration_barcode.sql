-- =============================================
-- MIGRASI LENGKAP: Perbaiki Skema + Barcode Keluar
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. PERBAIKI TABEL SPAREPARTS
-- =============================================

-- Rename kolom nama_sparepart -> nama (jika ada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spareparts' AND column_name = 'nama_sparepart'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spareparts' AND column_name = 'nama'
  ) THEN
    ALTER TABLE public.spareparts RENAME COLUMN nama_sparepart TO nama;
  END IF;
END $$;

-- Rename kolom harga_beli -> harga (jika ada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spareparts' AND column_name = 'harga_beli'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spareparts' AND column_name = 'harga'
  ) THEN
    ALTER TABLE public.spareparts RENAME COLUMN harga_beli TO harga;
  END IF;
END $$;

-- Tambahkan kolom yang mungkin belum ada
ALTER TABLE public.spareparts ADD COLUMN IF NOT EXISTS nama TEXT;
ALTER TABLE public.spareparts ADD COLUMN IF NOT EXISTS harga NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.spareparts ADD COLUMN IF NOT EXISTS harga_jual NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.spareparts ADD COLUMN IF NOT EXISTS kategori TEXT;
ALTER TABLE public.spareparts ADD COLUMN IF NOT EXISTS stok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.spareparts ADD COLUMN IF NOT EXISTS lokasi TEXT;

-- =============================================
-- 2. BUAT TABEL TRANSACTIONS (dengan barcode)
-- =============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL PRIMARY KEY,
  tipe TEXT NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jumlah INTEGER NOT NULL DEFAULT 1,
  sparepart_id BIGINT NOT NULL REFERENCES public.spareparts(id) ON DELETE CASCADE,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tambahkan kolom barcode jika tabel sudah ada tapi belum punya kolom ini
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS barcode TEXT;

-- =============================================
-- 3. BUAT TABEL SUPPLIERS (jika belum ada)
-- =============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id BIGSERIAL PRIMARY KEY,
  nama_perusahaan TEXT NOT NULL,
  kontak TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. INDEX
-- =============================================
CREATE INDEX IF NOT EXISTS idx_spareparts_nama ON public.spareparts (nama);
CREATE INDEX IF NOT EXISTS idx_spareparts_kategori ON public.spareparts (kategori);
CREATE INDEX IF NOT EXISTS idx_spareparts_kode_sku ON public.spareparts (kode_sku);
CREATE INDEX IF NOT EXISTS idx_transactions_tanggal ON public.transactions (tanggal);
CREATE INDEX IF NOT EXISTS idx_transactions_sparepart_id ON public.transactions (sparepart_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tipe ON public.transactions (tipe);
CREATE INDEX IF NOT EXISTS idx_transactions_barcode ON public.transactions (barcode);

-- =============================================
-- 5. RLS POLICIES
-- =============================================

-- Spareparts
ALTER TABLE public.spareparts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.spareparts;
CREATE POLICY "Allow all operations"
  ON public.spareparts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.transactions;
CREATE POLICY "Allow all operations"
  ON public.transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.suppliers;
CREATE POLICY "Allow all operations"
  ON public.suppliers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 6. DATA CONTOH (jika tabel spareparts kosong)
-- =============================================
INSERT INTO public.spareparts (kode_sku, nama, kategori, stok, harga, harga_jual, lokasi)
SELECT * FROM (VALUES
  ('SKU-001', 'Oli Mesin 1L', 'Oli', 25, 45000, 65000, 'Rak A-1'),
  ('SKU-002', 'Filter Udara', 'Filter', 15, 35000, 55000, 'Rak A-2'),
  ('SKU-003', 'Busi Standar', 'Busi', 40, 15000, 25000, 'Rak B-1'),
  ('SKU-004', 'Kampas Rem Depan', 'Rem', 10, 75000, 110000, 'Rak B-2'),
  ('SKU-005', 'Ban Tubeless 90/80', 'Ban', 8, 180000, 250000, 'Rak C-1'),
  ('SKU-006', 'Aki GS Astra 5Ah', 'Aki', 5, 320000, 450000, 'Rak C-2'),
  ('SKU-007', 'V-Belt', 'Mesin', 20, 25000, 40000, 'Rak D-1'),
  ('SKU-008', 'Lampu LED Headlamp', 'Lampu', 12, 55000, 85000, 'Rak D-2')
) AS v(kode_sku, nama, kategori, stok, harga, harga_jual, lokasi)
WHERE NOT EXISTS (SELECT 1 FROM public.spareparts LIMIT 1)
ON CONFLICT (kode_sku) DO NOTHING;