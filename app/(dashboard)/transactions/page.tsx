'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import PageHeader from '@/app/components/PageHeader'
import Barcode from '@/app/components/Barcode'
import { sfx } from '@/app/lib/sfx'
import BarcodeScanner from '@/app/components/BarcodeScanner'

interface Transaction {
  id: number
  tipe_transaksi: string | null
  created_at: string
  jumlah: number
  sparepart_id: number
}

interface PrintTarget {
  tipe_transaksi: string
  created_at: string
  jumlah: number
  nama: string
  kode: string
  barcode: string
}

interface Sparepart {
  id: number
  kode: string
  nama: string
  stok: number
  barcode?: string | null
}

const emptyForm = {
  tipe_transaksi: 'masuk',
  jumlah: 1,
  sparepart_id: 0,
}

// Fungsi generate barcode transaksi masuk/keluar (untuk cetak; disimpan sementara di state)
// Format: OUT-YYYYMMDD-<sparepart_id>-<jumlah>-<random>
//         IN-YYYYMMDD-<sparepart_id>-<jumlah>-<random>
const generateBarcode = (sparepartId: number, tipe: string, jumlah: number) => {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`
  const random = Math.floor(1000 + Math.random() * 9000)
  const prefix = tipe === 'keluar' ? 'OUT' : 'IN'
  return `${prefix}-${dateStr}-${sparepartId}-${jumlah}-${random}`
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [spareparts, setSpareparts] = useState<Sparepart[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filterTipe, setFilterTipe] = useState('')
  const [printBarcode, setPrintBarcode] = useState<PrintTarget | null>(null)
  const [scanValue, setScanValue] = useState('')
  const [scanMsg, setScanMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    const [txResult, spResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('spareparts')
        .select('id, kode, nama, stok, barcode')
        .order('nama', { ascending: true }),
    ])
    if (txResult.error) {
      console.error('Error mengambil transaksi:', txResult.error)
      setMessage({ type: 'error', text: 'Gagal mengambil data transaksi.' })
    } else {
      setTransactions(txResult.data || [])
    }
    if (spResult.error) {
      console.error('Error mengambil sparepart:', spResult.error)
    } else {
      setSpareparts(spResult.data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  // Sinkron realtime: perubahan dari perangkat lain langsung tampil tanpa perlu refresh
  useEffect(() => {
    const channel = supabase
      .channel('realtime-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spareparts' }, () => {
        fetchData()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'jumlah' || name === 'sparepart_id' ? Number(value) : value,
    }))
  }

  const resetForm = () => {
    setForm({ ...emptyForm })
    setShowForm(false)
    setMessage(null)
    setScanMsg(null)
  }

  const handleScan = async (override?: string) => {
    const raw = (override ?? scanValue).trim().toUpperCase()
    if (!raw) return
    setScanMsg(null)
    try {
      if (raw.startsWith('OUT-') || raw.startsWith('IN-')) {
        // Barcode resep transaksi (dari barcode yang dicetak saat transaksi)
        const parts = raw.split('-')
        const id = Number(parts[2])
        const qty = Number(parts[3]) || 1
        if (!id) throw new Error('Format barcode transaksi tidak valid.')
        const { data } = await supabase.from('spareparts').select('*').eq('id', id).maybeSingle()
        if (!data) throw new Error('Barang tidak ditemukan untuk barcode ini.')
        setForm((prev) => ({
          ...prev,
          sparepart_id: data.id,
          tipe_transaksi: raw.startsWith('OUT-') ? 'keluar' : 'masuk',
          jumlah: qty,
        }))
        sfx.scan()
        setScanMsg({
          type: 'success',
          text: `Barcode transaksi terdeteksi: "${data.nama}". Periksa jumlah lalu simpan.`,
        })
      } else {
        // Cari barang berdasarkan kode (SKU) ATAU barcode produk
        let { data } = await supabase.from('spareparts').select('*').eq('kode', raw).maybeSingle()
        if (!data) {
          ;({ data } = await supabase.from('spareparts').select('*').eq('barcode', raw).maybeSingle())
        }
        if (!data) throw new Error(`Barang dengan kode "${raw}" tidak ditemukan.`)
        setForm((prev) => ({ ...prev, sparepart_id: data.id }))
        sfx.scan()
        setScanMsg({ type: 'success', text: `Barang "${data.nama}" terdeteksi dari barcode.` })
      }
      setShowForm(true)
      setScanValue('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      sfx.error()
      const errMsg = e instanceof Error ? e.message : 'Barcode tidak ditemukan.'
      setScanMsg({ type: 'error', text: errMsg })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      if (!form.sparepart_id) {
        throw new Error('Pilih barang terlebih dahulu')
      }

      const { data: sparepart, error: spError } = await supabase
        .from('spareparts')
        .select('*')
        .eq('id', form.sparepart_id)
        .single()
      if (spError) throw spError

      let stokBaru = sparepart.stok
      if (form.tipe_transaksi === 'masuk') {
        stokBaru += form.jumlah
      } else {
        if (sparepart.stok < form.jumlah) {
          throw new Error(`Stok tidak mencukupi. Stok saat ini: ${sparepart.stok} unit`)
        }
        stokBaru -= form.jumlah
      }

      // Generate barcode resep transaksi (IN-/OUT-) untuk dicetak — tidak disimpan di DB
      const barcode = generateBarcode(form.sparepart_id, form.tipe_transaksi, form.jumlah)

      const { data: insertedTx, error: txError } = await supabase
        .from('transactions')
        .insert([
          {
            tipe_transaksi: form.tipe_transaksi,
            jumlah: form.jumlah,
            sparepart_id: form.sparepart_id,
          },
        ])
        .select('*')
        .single()
      if (txError) throw txError

      const { error: updateError } = await supabase
        .from('spareparts')
        .update({ stok: stokBaru })
        .eq('id', form.sparepart_id)
      if (updateError) throw updateError

      setMessage({
        type: 'success',
        text:
          form.tipe_transaksi === 'keluar'
            ? `Transaksi keluar berhasil dicatat. Stok "${sparepart.nama}" sekarang: ${stokBaru} unit.`
            : `Transaksi masuk berhasil dicatat. Stok "${sparepart.nama}" sekarang: ${stokBaru} unit.`,
      })
      sfx.success()

      // Auto tampilkan barcode hasil transaksi untuk dicetak
      setPrintBarcode({
        tipe_transaksi: form.tipe_transaksi,
        created_at: insertedTx?.created_at || new Date().toISOString(),
        jumlah: form.jumlah,
        nama: sparepart.nama,
        kode: sparepart.kode,
        barcode,
      })

      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error menyimpan transaksi:', error)
      sfx.error()
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Gagal menyimpan transaksi.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return
    try {
      // Ambil transaksi + sparepart terkait agar stok bisa dikembalikan dengan benar
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single()
      if (txError) throw txError

      const { data: sp, error: spError } = await supabase
        .from('spareparts')
        .select('*')
        .eq('id', tx.sparepart_id)
        .single()
      if (spError) throw spError

      // Balik efeknya: hapus "masuk" → stok turun; hapus "keluar" → stok naik
      const stokBaru =
        tx.tipe_transaksi === 'masuk'
          ? Math.max(0, sp.stok - tx.jumlah)
          : sp.stok + tx.jumlah

      const { error: updateError } = await supabase
        .from('spareparts')
        .update({ stok: stokBaru })
        .eq('id', tx.sparepart_id)
      if (updateError) throw updateError

      const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id)
      if (deleteError) throw deleteError

      setMessage({
        type: 'success',
        text: `Transaksi dihapus. Stok "${sp.nama}" disesuaikan menjadi ${stokBaru} unit.`,
      })
      sfx.deleted()
      fetchData()
    } catch (error) {
      console.error('Error menghapus transaksi:', error)
      setMessage({ type: 'error', text: 'Gagal menghapus transaksi.' })
    }
  }

  const handlePrintBarcode = () => {
    sfx.printed()
    if (!printRef.current) return
    const printContent = printRef.current.innerHTML
    const originalContent = document.body.innerHTML
    document.body.innerHTML = `
      <html>
        <head>
          <title>Cetak Barcode</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .barcode-print { text-align: center; }
            .barcode-print h3 { margin-bottom: 5px; }
            .barcode-print p { margin: 3px 0; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `
    window.print()
    document.body.innerHTML = originalContent
    setPrintBarcode(null)
  }

  const filteredTransactions = transactions.filter((item) => {
    return filterTipe === '' || item.tipe_transaksi === filterTipe
  })

  // Peta barang untuk menggabungkan nama/kode/barcode transaksi (tanpa embed FK)
  const spMap = new Map(spareparts.map((s) => [s.id, s]))

  const totalMasuk = transactions.filter((t) => t.tipe_transaksi === 'masuk').reduce((s, t) => s + t.jumlah, 0)
  const totalKeluar = transactions.filter((t) => t.tipe_transaksi === 'keluar').reduce((s, t) => s + t.jumlah, 0)
  const formatTanggal = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div>
      <PageHeader
        icon="🔁"
        title="Keluar / Masuk Barang"
        subtitle="Catat transaksi berbasis barcode — scan, isi jumlah, simpan"
      >
        <button
          className="btn-gold"
          onClick={() => {
            resetForm()
            setShowForm(true)
            sfx.toggle()
          }}
        >
          + Catat Transaksi
        </button>
      </PageHeader>

      <div className="mt-6 space-y-5">
        {/* Bar scan barcode */}
        <div className="anim-fade-up card p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleScan()
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">
                📷
              </span>
              <input
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                placeholder="Scan barcode (kode SKU / IN-… / OUT-…) lalu tekan Enter…"
                className="input pl-12"
                autoFocus
              />
            </div>
            <button type="submit" className="btn-ocean">🔎 Scan / Cari</button>
            <button
              type="button"
              onClick={() => {
                setScannerOpen(true)
                sfx.open()
              }}
              className="btn-gold"
              title="Scan barcode dengan kamera"
            >
              📷 Kamera
            </button>
          </form>
          <p className="mt-2 text-xs text-maroon-900/50">
            💡 Scanner USB berfungsi seperti keyboard — atau klik <strong>📷 Kamera</strong> untuk
            scan langsung lewat kamera ponsel/PC. Arahkan ke label barcode, formulir terisi otomatis.
          </p>
        </div>

        {scanMsg && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium ${
              scanMsg.type === 'success'
                ? 'bg-ocean-100 text-ocean-900 border border-ocean-200'
                : 'bg-maroon-100 text-maroon-900 border border-maroon-200'
            }`}
          >
            {scanMsg.text}
          </div>
        )}

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

        {/* Form transaksi */}
        {showForm && (
          <div className="anim-pop card border-maroon-900/15 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-maroon-900">✍️ Catat Transaksi Baru</h2>
              <button onClick={resetForm} className="btn-ghost">× Tutup</button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label">Tipe Transaksi *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, tipe_transaksi: 'masuk' }))}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                      form.tipe_transaksi === 'masuk'
                        ? 'border-ocean-600 bg-ocean-600 text-white'
                        : 'border-maroon-900/15 bg-white text-maroon-900/60 hover:border-ocean-400'
                    }`}
                  >
                    📥 Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, tipe_transaksi: 'keluar' }))}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                      form.tipe_transaksi === 'keluar'
                        ? 'border-maroon-700 bg-maroon-700 text-white'
                        : 'border-maroon-900/15 bg-white text-maroon-900/60 hover:border-maroon-400'
                    }`}
                  >
                    📤 Keluar
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Barang *</label>
                <select
                  name="sparepart_id"
                  value={form.sparepart_id}
                  onChange={handleInputChange}
                  required
                  className="input"
                >
                  <option value={0}>-- Pilih Barang --</option>
                  {spareparts.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.nama} ({sp.kode} — stok {sp.stok})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Jumlah *</label>
                <input
                  type="number"
                  name="jumlah"
                  value={form.jumlah}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="input"
                />
              </div>
              <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Menyimpan…' : '💾 Simpan Transaksi'}
                </button>
                <button type="button" onClick={resetForm} className="btn-ghost">Batal</button>
              </div>
            </form>
            <p className="mt-3 text-xs text-maroon-900/50">
              🏷️ Barcode <strong>IN-… / OUT-…</strong> dibuat otomatis setiap transaksi untuk dicetak & dipindai ulang.
            </p>
          </div>
        )}

        {/* Statistik */}
        <div className="anim-fade-up grid grid-cols-1 gap-4 sm:grid-cols-3" style={{ animationDelay: '0.05s' }}>
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-maroon-100">🧾</span>
              <p className="text-xs font-semibold text-maroon-900/60">Total Transaksi</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-maroon-900">{transactions.length}</p>
          </div>
          <div className="card border-ocean-200 bg-ocean-50/60 p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean-100">📥</span>
              <p className="text-xs font-semibold text-maroon-900/60">Total Barang Masuk</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-ocean-700">+{totalMasuk} unit</p>
          </div>
          <div className="card border-maroon-200 bg-maroon-50/60 p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-maroon-100">📤</span>
              <p className="text-xs font-semibold text-maroon-900/60">Total Barang Keluar</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-maroon-700">−{totalKeluar} unit</p>
          </div>
        </div>

        {/* Filter */}
        <div className="anim-fade-up card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-wrap gap-2">
            {[
              { v: '', label: '📋 Semua' },
              { v: 'masuk', label: '📥 Masuk' },
              { v: 'keluar', label: '📤 Keluar' },
            ].map((f) => (
              <button
                key={f.v}
                onClick={() => setFilterTipe(f.v)}
                className={`stat-chip transition ${
                  filterTipe === f.v
                    ? 'bg-maroon-700 text-white'
                    : 'bg-maroon-100 text-maroon-800 hover:bg-maroon-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-maroon-900/50">
            {filteredTransactions.length} dari {transactions.length} transaksi
          </p>
        </div>

        {/* Tabel transaksi */}
        <div className="anim-fade-up card overflow-hidden" style={{ animationDelay: '0.15s' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-maroon-900/10">
              <thead className="bg-maroon-900/[0.04]">
                <tr>
                  <th className="thead-th">Tanggal</th>
                  <th className="thead-th">Barang</th>
                  <th className="thead-th">Tipe</th>
                  <th className="thead-th">Jumlah</th>
                  <th className="thead-th">Barcode</th>
                  <th className="thead-th">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-maroon-900/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-maroon-900/60">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-maroon-700 border-t-transparent"></div>
                        Memuat data transaksi…
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-maroon-900/50">
                      {transactions.length === 0
                        ? 'Belum ada transaksi. Catat barang masuk/keluar melalui barcode di atas.'
                        : 'Tidak ada transaksi yang cocok dengan filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((item) => (
                    <tr key={item.id} className="transition hover:bg-maroon-50/60">
                      <td className="td text-maroon-900/70">{formatTanggal(item.created_at)}</td>
                      <td className="td">
                        <p className="font-semibold text-maroon-950">{spMap.get(item.sparepart_id)?.nama || '—'}</p>
                        <p className="font-mono text-xs text-maroon-900/40">{spMap.get(item.sparepart_id)?.kode || ''}</p>
                      </td>
                      <td className="td">
                        <span className={`stat-chip ${
                          item.tipe_transaksi === 'masuk' ? 'bg-ocean-100 text-ocean-800' : 'bg-maroon-100 text-maroon-700'
                        }`}>
                          {item.tipe_transaksi === 'masuk' ? '📥 Masuk' : '📤 Keluar'}
                        </span>
                      </td>
                      <td className={`td font-bold ${item.tipe_transaksi === 'masuk' ? 'text-ocean-700' : 'text-maroon-700'}`}>
                        {item.tipe_transaksi === 'masuk' ? '+' : '−'}{item.jumlah}
                      </td>
                      <td className="td">
                        {spMap.get(item.sparepart_id)?.barcode ? (
                          <span className="font-mono text-xs text-maroon-900/60">{spMap.get(item.sparepart_id)?.barcode}</span>
                        ) : (
                          <span className="text-xs text-maroon-900/30">-</span>
                        )}
                      </td>
                      <td className="td">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="btn-danger px-3 py-1.5 text-xs"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Cetak Barcode */}
        {printBarcode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="card w-full max-w-md p-6">
              <h3 className="text-lg font-extrabold text-maroon-900">🏷️ Barcode Transaksi</h3>
              <div ref={printRef} className="barcode-print mt-4 rounded-xl border-2 border-dashed border-maroon-900/20 p-4 text-center">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-maroon-900">
                  Bengkel FAS
                </h3>
                <p className="mt-1 text-xs font-semibold text-maroon-900/70">
                  {printBarcode.tipe_transaksi === 'keluar' ? '📤 BARANG KELUAR (PENJUALAN)' : '📥 BARANG MASUK (RESTOCK)'}
                </p>
                <p className="mt-1 text-sm font-bold text-maroon-900">
                  {printBarcode.nama} ({printBarcode.kode})
                </p>
                <p className="text-xs text-maroon-900/60">
                  Jumlah: {printBarcode.jumlah} unit | Tanggal: {formatTanggal(printBarcode.created_at)}
                </p>
                <div className="mt-2 flex justify-center bg-white p-2">
                  {printBarcode.barcode && (
                    <Barcode value={printBarcode.barcode} width={2} height={60} fontSize={12} />
                  )}
                </div>
                <p className="mt-1 font-mono text-xs text-maroon-900/80">{printBarcode.barcode}</p>
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={handlePrintBarcode} className="btn-ocean flex-1">
                  🖨️ Cetak Barcode
                </button>
                <button onClick={() => setPrintBarcode(null)} className="btn-ghost">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scanner kamera */}
        <BarcodeScanner
          open={scannerOpen}
          onClose={() => {
            setScannerOpen(false)
            sfx.close()
          }}
          onScan={(value) => {
            setScannerOpen(false)
            handleScan(value)
          }}
        />

        {/* Footer */}
        <footer className="pt-4 text-center text-xs text-maroon-900/40">
          <p>© {new Date().getFullYear()} Bengkel FAS — Manajemen Keluar Masuk Barang dengan Barcode</p>
        </footer>
      </div>
    </div>
  )
}