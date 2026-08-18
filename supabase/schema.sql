-- =============================================
-- Skema Database Bengkel FAS (keluar/masuk barang + barcode)
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- Tabel spareparts (barang bengkel)
CREATE TABLE IF NOT EXISTS public.spareparts (
  id BIGSERIAL PRIMARY KEY,
  kode TEXT NOT NULL UNIQUE,            -- kode SKU barang (dicetak sebagai barcode CODE-128)
  nama TEXT NOT NULL,
  kategori TEXT,
  merk TEXT,
  supplier_id BIGINT,
  harga_beli NUMERIC(12, 2) NOT NULL DEFAULT 0,
  harga_jual NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stok INTEGER NOT NULL DEFAULT 0,
  stok_minimum INTEGER NOT NULL DEFAULT 5,
  lokasi TEXT,
  barcode TEXT,                          -- barcode produk asli (EAN-13 dst) jika ada
  satuan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel suppliers (pemasok)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id BIGSERIAL PRIMARY KEY,
  kode TEXT,
  nama TEXT NOT NULL,
  alamat TEXT,
  telepon TEXT,
  email TEXT,
  kontak TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Tabel transactions (barang masuk / keluar)
-- tipe_transaksi: 'masuk' (restock) | 'keluar' (penjualan/pemakaian)
-- =============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL PRIMARY KEY,
  tipe_transaksi TEXT NOT NULL CHECK (tipe_transaksi IN ('masuk', 'keluar')),
  jumlah INTEGER NOT NULL DEFAULT 1,
  sparepart_id BIGINT REFERENCES public.spareparts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk pencarian
CREATE INDEX IF NOT EXISTS idx_spareparts_nama ON public.spareparts (nama);
CREATE INDEX IF NOT EXISTS idx_spareparts_kategori ON public.spareparts (kategori);
CREATE INDEX IF NOT EXISTS idx_spareparts_kode ON public.spareparts (kode);
CREATE INDEX IF NOT EXISTS idx_transactions_sparepart_id ON public.transactions (sparepart_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tipe ON public.transactions (tipe_transaksi);

-- =============================================
-- Row Level Security (RLS) - Allow all (untuk pengembangan)
-- =============================================
ALTER TABLE public.spareparts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON public.spareparts;
CREATE POLICY "Allow all operations"
  ON public.spareparts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations" ON public.transactions;
CREATE POLICY "Allow all operations"
  ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations" ON public.suppliers;
CREATE POLICY "Allow all operations"
  ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Data Contoh (Opsional - hapus jika tidak diperlukan)
-- =============================================
INSERT INTO public.spareparts (kode, nama, kategori, harga_beli, harga_jual, stok, stok_minimum, lokasi)
VALUES
  ('SPR-001', 'Oli Mesin 1L', 'Pelumas', 45000, 65000, 25, 10, 'Rak A-1'),
  ('SPR-002', 'Filter Udara', 'Filter', 35000, 55000, 15, 5, 'Rak A-2'),
  ('SPR-003', 'Busi Standar', 'Busi', 15000, 25000, 40, 10, 'Rak B-1'),
  ('SPR-004', 'Kampas Rem Depan', 'Rem', 75000, 110000, 10, 5, 'Rak B-2'),
  ('SPR-005', 'Ban Tubeless 90/80', 'Ban', 180000, 250000, 8, 3, 'Rak C-1'),
  ('SPR-006', 'Aki GS Astra 5Ah', 'Aki', 320000, 450000, 5, 2, 'Rak C-2'),
  ('SPR-007', 'V-Belt', 'Mesin', 25000, 40000, 20, 5, 'Rak D-1'),
  ('SPR-008', 'Lampu LED Headlamp', 'Lampu', 55000, 85000, 12, 5, 'Rak D-2')
ON CONFLICT (kode) DO NOTHING;

INSERT INTO public.suppliers (kode, nama, alamat, telepon, kontak)
VALUES
  ('SUP-001', 'PT Sumber Jaya Motor', 'Jl. Raya Cikarang No. 45, Bekasi', '021-88901234', 'Budi Santoso'),
  ('SUP-002', 'CV Auto Parts Indonesia', 'Jl. Gatot Subroto No. 12, Jakarta', '021-7890456', 'Siti Rahayu')
ON CONFLICT (kode) DO NOTHING;
