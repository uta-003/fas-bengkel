# 🔧 Bengkel FAS — Aplikasi Keluar Masuk Barang dengan Barcode

Aplikasi **bengkel / gudang sparepart** modern untuk mencatat **barang masuk & keluar berbasis barcode**.
Dibangun dengan **Next.js 16 + Tailwind CSS v4 + Supabase**, lengkap dengan dashboard analitik, cetak
label barcode, dan integrasi scanner barcode USB.

## 🎨 Palet Warna

| Warna | Hex | Peran |
| --- | --- | --- |
| Maroon gelap | `#540b0e` | Header, sidebar, primary gelap |
| Maroon | `#9e2a2b` | Tombol & aksi utama |
| Emas | `#e09f3e` | Aksen / CTA / brand |
| Krem | `#fff3b0` | Latar hangat & peringatan |
| Teal | `#335c67` | Info / stok masuk |

Warna diregistrasikan sebagai token Tailwind (`maroon-*`, `gold-*`, `cream-*`, `ocean-*`)
di `app/globals.css`.

## ✨ Fitur Utama

- **Inventaris Barang** — CRUD barang dengan kode SKU, kategori, harga, lokasi rak.
- **Keluar / Masuk Barang** — catat transaksi masuk (restock) & keluar (penjualan),
  stok otomatis ter-update.
- **Barcode**:
  - Cetak **label barcode** per barang (kode SKU, format CODE-128 via `jsbarcode`).
  - Setiap transaksi menghasilkan barcode unik `IN-YYYYMMDD-<id>-<qty>-<rand>` /
    `OUT-YYYYMMDD-<id>-<qty>-<rand>` → barcode **keluar & masuk**.
  - **Scan barcode** di halaman Transaksi — mendukung **scanner USB** (bertingkah
    seperti keyboard) **dan kamera ponsel/PC** (native `BarcodeDetector`, tombol
    `📷 Kamera`). Scan kode SKU *atau* barcode `IN-…`/`OUT-…` → barang & tipe
    terisi otomatis.
- **🔐 Login / Registrasi** — autentikasi Supabase Auth; semua halaman dashboard
  terlindungi (otomatis dialihkan ke `/login` jika belum masuk).
- **📱 Tampilan modern** bertema *maroon* `#540b0e` — kartu statistik gradasi,
  animasi, sidebar fleksibel, dan efek suara interaksi.
- **Logo & favicon** — favicon bawaan `app/icon.svg`; brand logo di sidebar/login
  otomatis memakai `/logo.png` Anda, lalu fallback ke `public/logo.svg`, lalu 🔧.
- **🔊 Efek suara** — suara interaksi (klik, berhasil, gagal, scan barcode, hapus,
  cetak) dibuat dengan Web Audio API (tanpa file audio). Bisa dimatikan/nyalakan
  lewat tombol 🔊 di sidebar.
- **🗂️ Sidebar fleksibel** — bisa **buka/tutup**: ciutkan jadi ikon (`«`/`»`),
  sembunyikan penuh (`⏴`), dan menu **accordion turun-naik** (grup "Menu Utama" &
  "Operasional"). Pilihan tersimpan otomatis di browser.
- **Dashboard** — statistik stok, nilai persediaan, potensi laba, grafik pergerakan
  6 bulan, barang stok menipis/habis, transaksi terakhir.
- **Supplier** — kelola data pemasok.
- **Login / Registrasi** — autentikasi Supabase Auth.

## 🧱 Teknologi

- [Next.js 16](https://nextjs.org) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) (Postgres + Auth)
- [JsBarcode](https://github.com/lindell/JsBarcode)

## 🚀 Cara Menjalankan

### 1. Persiapkan Database Supabase

1. Buat project di [Supabase](https://supabase.com).
2. Buka **SQL Editor**, jalankan `supabase/schema.sql`
   (atau `supabase/migration_barcode.sql` untuk menyelaraskan tabel lama).
   - Skrip membuat tabel `spareparts`, `suppliers`, `transactions`, index,
     RLS policy **Allow all**, dan data contoh.

> ✅ **Aplikasi sudah disesuaikan dengan skema asli di project Supabase Anda**:
> spareparts memakai kolom `kode` (SKU), `harga_beli`, `harga_jual`, `stok`,
> `lokasi`, `barcode` (barcode produk); suppliers memakai `nama` & `kontak`;
> transactions memakai `tipe_transaksi` (`masuk`/`keluar`), `jumlah`,
> `sparepart_id`, `created_at` — **tanpa perlu migrasi**.

#### 🔄 Sinkronisasi Data (semua input/hapus → Supabase)

Semua aksi **tambah / edit / hapus** barang, supplier, dan transaksi **langsung
ditulis ke database Supabase**, bukan disimpan di browser. Jadi data yang Anda
input di satu komputer/HP akan tampil sama di perangkat lain — cukup buka
aplikasinya di mana saja (login dengan akun yang sama).

- **Setiap halaman mengambil data langsung dari Supabase** setiap kali dibuka.
- **Realtime (opsional)**: agar perubahan dari perangkat lain langsung muncul
  *tanpa refresh*, jalankan sekali di SQL Editor:
  ```
  supabase/enable_realtime.sql
  ```
  (dan pastikan Realtime diaktifkan di Supabase dashboard → Project Settings →
  Realtime). Tanpa ini, data tetap sinkron tetapi perlu refresh halaman.
- **Perbaikan FK (opsional)**: jalankan sekali `supabase/fix_fk_cascade.sql`
  agar DB benar-benar menghapus transaksi saat barang dihapus (`ON DELETE
  CASCADE`), sesuai `schema.sql`. Aplikasi sudah membersihkan transaksi terkait
  sendiri saat barang dihapus, dan sudah memulihkan stok saat transaksi
  dihapus — skrip ini menambahkan pengaman di sisi database.
- **Stok menipis** dihitung dari kolom `stok_minimum` (bukan angka tetap 5).

#### 🧪 Verifikasi koneksi & CRUD

```bash
node verify-auth.cjs   # cek login/register terhubung ke Supabase Auth
node verify-crud.cjs   # uji tulis-baca-ubah-hapus live di 3 tabel (data uji dihapus lagi)
node verify-fk.cjs     # cek perilaku FK saat barang ber-transaksi dihapus
```

### 2. Konfigurasi Environment

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-public-key-anda
```

### 3. Install & Jalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Script lain

```bash
npm run build   # build produksi
npm run start   # jalankan hasil build
npm run lint    # lint ESLint
```

## 🖱️ Alur Penggunaan

1. **Kelola barang** di menu *Inventaris Barang* → tambah barang (kode SKU wajib
   unik) → cetak **label barcode** untuk ditempel di rak/gudang.
2. **Mencatat transaksi** di menu *Keluar / Masuk*:
   - Pilih tipe **Masuk** / **Keluar**.
   - Scan label barcode barang (scanner USB) *atau* pilih dari daftar.
   - Isi jumlah & tanggal → **Simpan**. Stok ter-update otomatis dan barcode
     transaksi langsung muncul untuk dicetak (ditempel pada barang/DO).
3. **Pantau stok** di *Dashboard* — cek barang menipis, nilai persediaan, dan
   grafik pergerakan stok 6 bulan.

## 📁 Struktur

```
app/
├─ layout.tsx              # Root layout (font, metadata, favicon)
├─ globals.css             # Token warna + animasi + komponen desain
├─ icon.svg                # Favicon logo (kunci inggris maroon-emas)
├─ login/page.tsx          # Halaman login/register
├─ lib/
│  ├─ supabase.js          # Koneksi Supabase
│  └─ sfx.ts               # Mesin efek suara (Web Audio API)
├─ components/
│  ├─ AppShell.tsx         # Status sidebar (full/mini/hidden)
│  ├─ SoundProvider.tsx    # Suara klik global
│  ├─ Sidebar.tsx          # Sidebar responsif + accordion + mobile drawer
│  ├─ PageHeader.tsx       # Banner halaman
│  ├─ Logo.tsx             # Brand logo (/logo.png → /logo.svg → 🔧)
│  ├─ RequireAuth.tsx      # Pengaman rute (arahkan ke /login bila belum masuk)
│  ├─ Barcode.tsx          # Generator barcode (jsbarcode)
│  └─ BarcodeScanner.tsx   # Scan barcode lewat kamera (BarcodeDetector API)
└─ (dashboard)/
   ├─ layout.tsx           # Shell dengan sidebar
   ├─ page.tsx             # Inventaris Barang
   ├─ dashboard/page.tsx   # Dashboard analitik
   ├─ transactions/page.tsx # Keluar/Masuk barang + scan barcode
   ├─ suppliers/page.tsx   # Data supplier
   └─ sparepart/[id]/page.tsx # Detail & riwayat barang
```

© 2026 Bengkel FAS