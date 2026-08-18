'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import PageHeader from '@/app/components/PageHeader'
import Barcode from '@/app/components/Barcode'
import { sfx, getSfxEnabled } from '@/app/lib/sfx'
import Link from 'next/link'

interface Sparepart {
  id: number
  kode: string
  nama: string
  kategori?: string | null
  stok: number
  stok_minimum?: number | null
  harga_beli: number
  harga_jual: number
  lokasi?: string | null
  barcode?: string | null
}

const emptyForm = {
  kode: '',
  nama: '',
  kategori: '',
  stok: 0,
  harga_beli: 0,
  harga_jual: 0,
  lokasi: '',
}

const ITEMS_PER_PAGE = 10

export default function InventoryPage() {
  const [spareparts, setSpareparts] = useState<Sparepart[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showLowStock, setShowLowStock] = useState(false)
  const [labelTarget, setLabelTarget] = useState<Sparepart | null>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const fetchSpareparts = useCallback(async () => {
    const { data, error } = await supabase
      .from('spareparts')
      .select('*')
      .order('nama', { ascending: true })
    if (error) {
      console.error('Error mengambil data:', error)
      setMessage({ type: 'error', text: 'Gagal mengambil data dari database.' })
    } else {
      setSpareparts(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSpareparts()
  }, [fetchSpareparts])

    // Sinkron realtime: perubahan dari perangkat lain langsung tampil tanpa perlu refresh
  useEffect(() => {
    const channel = supabase
      .channel('realtime-inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spareparts' }, () => {
        fetchSpareparts()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    }, [fetchSpareparts])

  const [warnedLowStock, setWarnedLowStock] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'stok' || name === 'harga_beli' || name === 'harga_jual'
          ? Number(value)
          : value,
    }))
  }

  // Auto-generate unique SKU/barcode code
  const generateSKU = useCallback(() => {
    const used = new Set(spareparts.map((s) => s.kode))
    const year = new Date().getFullYear().toString().slice(-2)
    let counter = 1
    while (counter < 9999) {
      const num = String(counter).padStart(3, '0')
      const sku = `SKU-${year}${num}`
      if (!used.has(sku) && !form.kode) {
        setForm((prev) => ({ ...prev, kode: sku }))
        sfx.success()
        return
      }
      counter = counter + 1
    }
  }, [spareparts, form.kode])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const payload = { ...form, kategori: form.kategori || null, lokasi: form.lokasi || null }
      if (editingId) {
        const { error } = await supabase.from('spareparts').update(payload).eq('id', editingId)
        if (error) throw error
        setMessage({ type: 'success', text: 'Data barang berhasil diperbarui.' })
        sfx.success()
      } else {
        const { error } = await supabase.from('spareparts').insert([payload])
        if (error) throw error
        setMessage({ type: 'success', text: 'Data barang berhasil ditambahkan.' })
        sfx.success()
      }
      resetForm()
      fetchSpareparts()
    } catch (error) {
      console.error('Error menyimpan data:', error)
      sfx.error()
      const isDuplicate = (error as { code?: string } | null)?.code === '23505'
      setMessage({
        type: 'error',
        text: isDuplicate
          ? 'Kode SKU sudah pernah digunakan. Gunakan kode lain.'
          : 'Gagal menyimpan data. Periksa kembali input Anda.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: Sparepart) => {
    setEditingId(item.id)
    setForm({
      kode: item.kode,
      nama: item.nama,
      kategori: item.kategori || '',
      stok: item.stok,
      harga_beli: item.harga_beli,
      harga_jual: item.harga_jual,
      lokasi: item.lokasi || '',
    })
    setShowForm(true)
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Yakin ingin menghapus "${nama}"?`)) return
    try {
      // Bersihkan riwayat transaksi terkait agar tidak ada data yatim (sesuai skema ON DELETE CASCADE)
      const { error: txError } = await supabase.from('transactions').delete().eq('sparepart_id', id)
      if (txError) throw txError
      const { error } = await supabase.from('spareparts').delete().eq('id', id)
      if (error) throw error
      setMessage({ type: 'success', text: `Barang "${nama}" beserta riwayat transaksinya berhasil dihapus.` })
      sfx.deleted()
      fetchSpareparts()
    } catch (error) {
      console.error('Error menghapus data:', error)
      setMessage({ type: 'error', text: 'Gagal menghapus data barang.' })
    }
  }

  const exportCSV = () => {
    const header = ['Kode SKU', 'Nama', 'Kategori', 'Stok', 'Harga Beli', 'Harga Jual', 'Lokasi']
    const rows = spareparts.map((s) => [
      s.kode,
      s.nama,
      s.kategori || '',
      s.stok,
      s.harga_beli,
      s.harga_jual,
      s.lokasi || '',
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventaris-bengkel-fas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredSpareparts = spareparts.filter((item) => {
    const matchSearch =
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.kode.toLowerCase().includes(search.toLowerCase())
    const matchLow = showLowStock ? item.stok <= (item.stok_minimum ?? 5) : true
    return matchSearch && matchLow
  })

  const totalPages = Math.max(1, Math.ceil(filteredSpareparts.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginated = filteredSpareparts.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const totalJenis = spareparts.length
  const totalStok = spareparts.reduce((s, i) => s + i.stok, 0)
    const totalNilai = spareparts.reduce((s, i) => s + i.stok * i.harga_beli, 0)
  const stokMenipis = spareparts.filter((i) => i.stok <= (i.stok_minimum ?? 5))

  // Auto sound warning ketika ada stok menipis (hanya sekali saat data loaded)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!loading && stokMenipis.length > 0 && !warnedLowStock && getSfxEnabled()) {
      sfx.warning()
      setWarnedLowStock(true)
    }
  }, [loading, stokMenipis, warnedLowStock])

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num)

  const handlePrintLabel = () => {
    sfx.printed()
    if (!labelRef.current) return
    const printContent = labelRef.current.innerHTML
    const original = document.body.innerHTML
    document.body.innerHTML = `
      <html><head><title>Cetak Label Barcode</title></head>
      <body style="font-family:Arial,sans-serif;padding:16px;">
        ${printContent}
      </body></html>
    `
    window.print()
    document.body.innerHTML = original
    setLabelTarget(null)
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        icon="📦"
        title="Inventaris Barang"
        subtitle="Kelola data barang & cetak label barcode untuk keluar masuk"
      >
        <button className="btn-gold" onClick={exportCSV}>
          📥 Export CSV
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm()
            setShowForm(true)
            sfx.toggle()
          }}
        >
          + Tambah Barang
        </button>
      </PageHeader>

      <div className="mt-6 space-y-5">
        {/* Pesan */}
        {message && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium ${
              message.type === 'success'
                ? 'bg-ocean-100 text-ocean-900 border border-ocean-200'
                : 'bg-maroon-100 text-maroon-900 border border-maroon-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Peringatan stok menipis */}
        {stokMenipis.length > 0 && (
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
              showLowStock
                ? 'border-gold-400 bg-cream-100 text-maroon-900'
                : 'border-gold-300 bg-cream-100/70 text-maroon-900 hover:bg-cream-100'
            }`}
          >
            <span>
              ⚠️ Terdapat <strong>{stokMenipis.length} barang</strong> dengan stok di bawah batas minimum — segera restock.
            </span>
            <span className="shrink-0 underline underline-offset-2">
              {showLowStock ? 'Tampilkan semua' : 'Lihat daftar'}
            </span>
          </button>
        )}

        {/* Statistik */}
        <div className="anim-fade-up grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ animationDelay: '0.05s' }}>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-maroon-100 text-lg">🧰</div>
              <p className="text-xs font-semibold text-maroon-900/60">Jenis Barang</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-maroon-900">{totalJenis}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean-100 text-lg">📦</div>
              <p className="text-xs font-semibold text-maroon-900/60">Total Stok</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-maroon-900">{totalStok} unit</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-lg">💰</div>
              <p className="text-xs font-semibold text-maroon-900/60">Nilai Stok (Modal)</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-maroon-900">{formatRupiah(totalNilai)}</p>
          </div>
          <div className={`card p-5 ${stokMenipis.length > 0 ? 'border-gold-400 bg-gold-100/60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-maroon-100 text-lg">⚠️</div>
              <p className="text-xs font-semibold text-maroon-900/60">Stok Menipis</p>
            </div>
            <p className={`mt-3 text-2xl font-extrabold ${stokMenipis.length > 0 ? 'text-maroon-700' : 'text-maroon-900'}`}>
              {stokMenipis.length} item
            </p>
          </div>
        </div>

        {/* Pencarian */}
        <div className="anim-fade-up card flex flex-col gap-3 p-4 sm:flex-row sm:items-center" style={{ animationDelay: '0.1s' }}>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-maroon-900/40">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Cari nama barang atau kode SKU… (bisa juga scan barcode dengan scanner USB)"
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowLowStock((v) => !v)}
            className={`stat-chip ${showLowStock ? 'bg-gold-500 text-maroon-950' : 'bg-maroon-100 text-maroon-800'}`}
          >
            {showLowStock ? '✓' : '○'} Hanya stok menipis
          </button>
        </div>

        {/* Form Tambah/Edit */}
        {showForm && (
          <div className="anim-pop card border-maroon-900/15 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-maroon-900">
                {editingId ? '✏️ Edit Barang' : '＋ Tambah Barang Baru'}
              </h2>
              <button onClick={resetForm} className="btn-ghost">× Tutup</button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label flex items-center justify-between">
                  Kode SKU / Barcode *
                  {!editingId && form.kode === '' && (
                    <button
                      type="button"
                      onClick={generateSKU}
                      className="text-xs font-semibold text-gold-600 hover:text-gold-700 underline"
                      data-sfx="off"
                    >
                      🔄 Auto-generate
                    </button>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="kode"
                    value={form.kode}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: SKU-001"
                    className="input flex-1"
                  />
                  {form.kode && !editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, kode: '' }))
                        sfx.click()
                      }}
                      className="px-2 text-xs text-maroon-700/50 hover:text-maroon-900"
                      title="Reset kode"
                      data-sfx="off"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Nama Barang *</label>
                <input
                  type="text"
                  name="nama"
                  value={form.nama}
                  onChange={handleInputChange}
                  required
                  placeholder="Contoh: Oli Mesin 1L"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Kategori</label>
                <input
                  type="text"
                  name="kategori"
                  value={form.kategori}
                  onChange={handleInputChange}
                  placeholder="Contoh: Oli, Filter, Ban"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Stok *</label>
                <input
                  type="number"
                  name="stok"
                  value={form.stok}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Harga Beli (Rp)</label>
                <input
                  type="number"
                  name="harga_beli"
                  value={form.harga_beli}
                  onChange={handleInputChange}
                  min="0"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Harga Jual (Rp) *</label>
                <input
                  type="number"
                  name="harga_jual"
                  value={form.harga_jual}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Lokasi Rak</label>
                <input
                  type="text"
                  name="lokasi"
                  value={form.lokasi}
                  onChange={handleInputChange}
                  placeholder="Contoh: Rak A-1"
                  className="input"
                />
              </div>
              <div className="flex items-end gap-3">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Simpan Barang'}
                </button>
                <button type="button" onClick={resetForm} className="btn-ghost">
                  Batal
                </button>
              </div>
            </form>
            <p className="mt-3 text-xs text-maroon-900/50">
              💡 Kode SKU akan dicetak sebagai label barcode (CODE-128) untuk proses keluar masuk barang.
            </p>
          </div>
        )}

        {/* Tabel Data */}
        <div className="anim-fade-up card overflow-hidden" style={{ animationDelay: '0.15s' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-maroon-900/10">
              <thead className="bg-maroon-900/[0.04]">
                <tr>
                  <th className="thead-th">Kode SKU</th>
                  <th className="thead-th">Nama Barang</th>
                  <th className="thead-th">Stok</th>
                  <th className="thead-th">Harga Beli</th>
                  <th className="thead-th">Harga Jual</th>
                  <th className="thead-th">Label</th>
                  <th className="thead-th">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-maroon-900/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-maroon-900/60">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-maroon-700 border-t-transparent"></div>
                        Memuat data dari database…
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-maroon-900/50">
                      {spareparts.length === 0
                        ? 'Belum ada data barang. Klik "＋ Tambah Barang" untuk memulai.'
                        : 'Tidak ada barang yang cocok dengan pencarian.'}
                    </td>
                  </tr>
                ) : (
                  paginated.map((item) => (
                    <tr key={item.id} className="transition hover:bg-maroon-50/60">
                      <td className="td">
                        <span className="font-mono text-xs font-semibold text-ocean-700">{item.kode}</span>
                      </td>
                      <td className="td">
                        <p className="font-semibold text-maroon-950">{item.nama}</p>
                        {item.kategori && (
                          <p className="text-xs text-maroon-900/50">
                            {item.kategori}
                            {item.lokasi ? ` • ${item.lokasi}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="td">
                        <span className={`stat-chip ${
                          item.stok <= 0
                            ? 'bg-maroon-700 text-white'
                            : item.stok <= (item.stok_minimum ?? 5)
                              ? 'bg-gold-200 text-maroon-900'
                              : 'bg-ocean-100 text-ocean-800'
                        }`}>
                          {item.stok <= 0 ? 'Habis' : `${item.stok} unit`}
                        </span>
                      </td>
                      <td className="td tabular-nums text-maroon-900/70">{formatRupiah(item.harga_beli)}</td>
                      <td className="td tabular-nums font-semibold text-maroon-950">{formatRupiah(item.harga_jual)}</td>
                      <td className="td">
                        <button
                          onClick={() => setLabelTarget(item)}
                          className="btn-ghost px-3 py-1.5 text-xs"
                          title="Cetak label barcode kode SKU"
                        >
                          🏷️ Label
                        </button>
                      </td>
                      <td className="td">
                        <div className="flex gap-2">
                          <Link href={`/sparepart/${item.id}`} className="btn-ocean px-3 py-1.5 text-xs">
                            Riwayat
                          </Link>
                          <button onClick={() => handleEdit(item)} className="btn-gold px-3 py-1.5 text-xs">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(item.id, item.nama)} className="btn-danger px-3 py-1.5 text-xs">
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredSpareparts.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-maroon-900/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-maroon-900/60">
                Menampilkan <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + ITEMS_PER_PAGE, filteredSpareparts.length)}</strong> dari{' '}
                <strong>{filteredSpareparts.length}</strong> barang
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  ← Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      currentPage === p
                        ? 'bg-maroon-700 text-white'
                        : 'bg-maroon-50 text-maroon-800 hover:bg-maroon-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="pt-4 text-center text-xs text-maroon-900/40">
          <p>© {new Date().getFullYear()} Bengkel FAS — Sistem Keluar Masuk Barang Berbasis Barcode</p>
        </footer>
      </div>

      {/* Modal Cetak Label */}
      {labelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6">
            <h3 className="text-lg font-extrabold text-maroon-900">🏷️ Label Barcode Barang</h3>
            <div ref={labelRef} className="mt-4 rounded-xl border-2 border-dashed border-maroon-900/20 p-4 text-center">
              <p className="text-sm font-extrabold uppercase tracking-wide text-maroon-900">Bengkel FAS</p>
              <p className="text-xs text-maroon-900/60">{labelTarget.nama}</p>
              <div className="mt-2 flex justify-center bg-white p-2">
                <Barcode value={labelTarget.barcode || labelTarget.kode} width={2} height={55} fontSize={12} />
              </div>
              <p className="mt-1 font-mono text-xs font-semibold text-maroon-900">{labelTarget.barcode || labelTarget.kode}</p>
              <p className="mt-2 text-sm font-bold text-maroon-900">{formatRupiah(labelTarget.harga_jual)}</p>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={handlePrintLabel} className="btn-primary flex-1">🖨️ Cetak Label</button>
              <button onClick={() => setLabelTarget(null)} className="btn-ghost">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}