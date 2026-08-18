'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import PageHeader from '@/app/components/PageHeader'
import Link from 'next/link'

import { Package, Boxes, Wallet, Tags, TrendingUp, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

interface Sparepart {
  id: number
  kode: string
  nama: string
  kategori?: string | null
  stok: number
  stok_minimum?: number | null
  harga_beli: number
  harga_jual: number
}

interface Transaction {
  id: number
  tipe_transaksi: string | null
  created_at: string
  jumlah: number
  sparepart_id: number
}

export default function DashboardPage() {
  const [spareparts, setSpareparts] = useState<Sparepart[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [spResult, txResult] = await Promise.all([
      supabase.from('spareparts').select('*'),
      supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: true }),
    ])
    if (spResult.error) console.error('Error spareparts:', spResult.error)
    else setSpareparts(spResult.data || [])
    if (txResult.error) console.error('Error transactions:', txResult.error)
    else setTransactions(txResult.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  // Sinkron realtime: perubahan dari perangkat lain langsung tampil tanpa perlu refresh
  useEffect(() => {
    const channel = supabase
      .channel('realtime-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spareparts' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchData()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num)

  const formatTanggal = (date: string) =>
    new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

  // Statistik utama
  const totalJenis = spareparts.length
  const totalStok = spareparts.reduce((s, i) => s + i.stok, 0)
  const totalNilaiModal = spareparts.reduce((s, i) => s + i.stok * i.harga_beli, 0)
  const totalNilaiJual = spareparts.reduce((s, i) => s + i.stok * i.harga_jual, 0)
  const potensiLaba = totalNilaiJual - totalNilaiModal
  const stokMenipis = spareparts.filter((i) => i.stok > 0 && i.stok <= (i.stok_minimum ?? 5))
  const stokHabis = spareparts.filter((i) => i.stok <= 0)

  // Transaksi bulan ini
  const bulanIni = new Date().getMonth()
  const tahunIni = new Date().getFullYear()
  const txBulanIni = transactions.filter((t) => {
    const d = new Date(t.created_at)
    return d.getMonth() === bulanIni && d.getFullYear() === tahunIni
  })
  const totalMasukBulanIni = txBulanIni
    .filter((t) => t.tipe_transaksi === 'masuk')
    .reduce((s, t) => s + t.jumlah, 0)
  const totalKeluarBulanIni = txBulanIni
    .filter((t) => t.tipe_transaksi === 'keluar')
    .reduce((s, t) => s + t.jumlah, 0)

  // Grafik pergerakan 6 bulan terakhir
  const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const month = d.getMonth()
    const year = d.getFullYear()
    const txBulan = transactions.filter((t) => {
      const td = new Date(t.created_at)
      return td.getMonth() === month && td.getFullYear() === year
    })
    const masuk = txBulan.filter((t) => t.tipe_transaksi === 'masuk').reduce((s, t) => s + t.jumlah, 0)
    const keluar = txBulan.filter((t) => t.tipe_transaksi === 'keluar').reduce((s, t) => s + t.jumlah, 0)
    return { bulan: `${bulanNames[month]} '${String(year).slice(2)}`, masuk, keluar }
  })
  const maxChartValue = Math.max(...chartData.map((d) => Math.max(d.masuk, d.keluar)), 1)

  // Top 5 stok
  const topStok = [...spareparts].sort((a, b) => b.stok - a.stok).slice(0, 5)
  const maxTopStok = Math.max(...topStok.map((s) => s.stok), 1)

  // Top 5 nilai jual
  const topNilai = [...spareparts]
    .map((s) => ({ ...s, nilai: s.stok * s.harga_jual }))
    .sort((a, b) => b.nilai - a.nilai)
    .slice(0, 5)
  const maxTopNilai = Math.max(...topNilai.map((s) => s.nilai), 1)

  // Transaksi terakhir
  const txTerakhir = [...transactions].reverse().slice(0, 8)

  // Peta barang untuk menggabungkan nama/kode transaksi (tanpa embed FK)
  const spMap = new Map(spareparts.map((s) => [s.id, s]))

  return (
    <div>
      <PageHeader
        icon="📊"
        title="Dashboard Bengkel"
        subtitle={`Ringkasan inventaris per ${new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`}
      >
        <Link href="/transactions" className="btn-gold">🔁 Catat Transaksi</Link>
      </PageHeader>

      <div className="mt-6 space-y-5">
        {loading && (
          <div className="card flex items-center justify-center gap-2 p-8 text-maroon-900/60">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-maroon-700 border-t-transparent"></div>
            Memuat data dashboard…
          </div>
        )}
        {/* Statistik utama */}
        <div className="anim-fade-up grid grid-cols-2 gap-4 lg:grid-cols-5" style={{ animationDelay: '0.05s' }}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-maroon-900 to-maroon-950 p-5 text-white shadow-lg shadow-maroon-900/25 transition-transform hover:-translate-y-0.5">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold-500/20 blur-xl" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-maroon-100/70">Jenis Barang</p>
                <p className="mt-1 text-3xl font-extrabold">{totalJenis}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Package className="h-5 w-5 text-gold-400" />
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 p-5 text-white shadow-lg shadow-ocean-800/25 transition-transform hover:-translate-y-0.5">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-ocean-100/80">Total Stok</p>
                <p className="mt-1 text-3xl font-extrabold">{totalStok} unit</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Boxes className="h-5 w-5 text-ocean-100" />
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold-500 to-gold-700 p-5 text-maroon-950 shadow-lg shadow-gold-700/25 transition-transform hover:-translate-y-0.5">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/25 blur-xl" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-maroon-900/70">Nilai Modal</p>
                <p className="mt-1 text-xl font-extrabold sm:text-2xl">{formatRupiah(totalNilaiModal)}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                <Wallet className="h-5 w-5 text-maroon-950" />
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-maroon-600 to-maroon-800 p-5 text-white shadow-lg shadow-maroon-900/25 transition-transform hover:-translate-y-0.5">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold-500/15 blur-xl" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-maroon-100/70">Nilai Jual</p>
                <p className="mt-1 text-xl font-extrabold sm:text-2xl">{formatRupiah(totalNilaiJual)}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Tags className="h-5 w-5 text-gold-400" />
              </div>
            </div>
          </div>
          <div
            className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-transform hover:-translate-y-0.5 ${
              potensiLaba >= 0
                ? 'bg-gradient-to-br from-ocean-500 to-ocean-700 shadow-ocean-800/25'
                : 'bg-gradient-to-br from-maroon-700 to-maroon-950 shadow-maroon-900/25'
            }`}
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-white/80">Potensi Laba</p>
                <p className="mt-1 text-xl font-extrabold sm:text-2xl">{formatRupiah(potensiLaba)}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Masuk / Keluar bulan ini */}
        <div className="anim-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2" style={{ animationDelay: '0.1s' }}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 p-5 text-white shadow-lg shadow-ocean-800/25">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ocean-100/80">Barang Masuk (Bulan Ini)</p>
                <p className="mt-1 text-3xl font-extrabold">+{totalMasukBulanIni} unit</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <ArrowDownToLine className="h-7 w-7 text-ocean-100" />
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-maroon-700 to-maroon-900 p-5 text-white shadow-lg shadow-maroon-900/25">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold-500/15 blur-xl" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-maroon-100/80">Barang Keluar (Bulan Ini)</p>
                <p className="mt-1 text-3xl font-extrabold">−{totalKeluarBulanIni} unit</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <ArrowUpFromLine className="h-7 w-7 text-maroon-100" />
              </div>
            </div>
          </div>
        </div>

        {/* Grafik 6 bulan */}
        <div className="anim-fade-up card p-6" style={{ animationDelay: '0.15s' }}>
          <h2 className="text-lg font-extrabold text-maroon-900">Pergerakan Stok — 6 Bulan Terakhir</h2>
          <div className="mt-5 flex items-end justify-between gap-3">
            {chartData.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <div
                    className="w-2.5 rounded-t-md bg-ocean-500 transition-all sm:w-3"
                    style={{ height: `${(d.masuk / maxChartValue) * 100}%` }}
                    title={`Masuk: ${d.masuk}`}
                  ></div>
                  <div
                    className="w-2.5 rounded-t-md bg-maroon-600 transition-all sm:w-3"
                    style={{ height: `${(d.keluar / maxChartValue) * 100}%` }}
                    title={`Keluar: ${d.keluar}`}
                  ></div>
                </div>
                <span className="text-[10px] font-semibold text-maroon-900/50">{d.bulan}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-5 text-xs text-maroon-900/60">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-ocean-500"></span> Masuk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-maroon-600"></span> Keluar
            </span>
          </div>
        </div>

        <div className="anim-fade-up grid grid-cols-1 gap-5 lg:grid-cols-2" style={{ animationDelay: '0.2s' }}>
          {/* Top 5 stok */}
          <div className="card p-6">
            <h2 className="text-lg font-extrabold text-maroon-900">🏆 Top 5 Stok Terbanyak</h2>
            <div className="mt-4 space-y-3">
              {topStok.map((s) => (
                <div key={s.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-maroon-950">{s.nama}</span>
                    <span className="font-medium text-maroon-900/60">{s.stok} unit</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-maroon-900/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ocean-500 to-ocean-600"
                      style={{ width: `${(s.stok / maxTopStok) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 nilai */}
          <div className="card p-6">
            <h2 className="text-lg font-extrabold text-maroon-900">💎 Top 5 Nilai Persediaan</h2>
            <div className="mt-4 space-y-3">
              {topNilai.map((s) => (
                <div key={s.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-maroon-950">{s.nama}</span>
                    <span className="font-medium text-maroon-900/60">{formatRupiah(s.nilai)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-maroon-900/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600"
                      style={{ width: `${(s.nilai / maxTopNilai) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Peringatan stok */}
        <div className="anim-fade-up grid grid-cols-1 gap-5 lg:grid-cols-2" style={{ animationDelay: '0.25s' }}>
          <div className="card border-gold-300 p-6">
            <h2 className="text-lg font-extrabold text-maroon-900">⚠️ Stok Menipis (≤ 5)</h2>
            {stokMenipis.length === 0 ? (
              <p className="mt-3 text-sm text-maroon-900/50">Semua stok aman. 👍</p>
            ) : (
              <div className="mt-3 space-y-2">
                {stokMenipis.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-gold-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-maroon-950">{item.nama}</p>
                      <p className="font-mono text-xs text-maroon-900/50">{item.kode}</p>
                    </div>
                    <span className="stat-chip bg-gold-500 text-maroon-950">{item.stok} unit</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card border-maroon-200 p-6">
            <h2 className="text-lg font-extrabold text-maroon-900">🚨 Stok Habis</h2>
            {stokHabis.length === 0 ? (
              <p className="mt-3 text-sm text-maroon-900/50">Tidak ada barang yang habis. 👍</p>
            ) : (
              <div className="mt-3 space-y-2">
                {stokHabis.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-maroon-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-maroon-950">{item.nama}</p>
                      <p className="font-mono text-xs text-maroon-900/50">{item.kode}</p>
                    </div>
                    <span className="stat-chip bg-maroon-700 text-white">Perlu Restock</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transaksi terakhir */}
        <div className="anim-fade-up card overflow-hidden" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-lg font-extrabold text-maroon-900">🕘 Transaksi Terakhir</h2>
            <Link href="/transactions" className="btn-ghost px-3 py-1.5 text-xs">Lihat Semua</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-maroon-900/10">
              <thead className="bg-maroon-900/[0.04]">
                <tr>
                  <th className="thead-th">Tanggal</th>
                  <th className="thead-th">Barang</th>
                  <th className="thead-th">Tipe</th>
                  <th className="thead-th">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-maroon-900/5">
                {txTerakhir.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-maroon-900/50">
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  txTerakhir.map((t) => (
                    <tr key={t.id} className="transition hover:bg-maroon-50/60">
                      <td className="td text-maroon-900/70">{formatTanggal(t.created_at)}</td>
                      <td className="td">
                        <span className="font-semibold text-maroon-950">{spMap.get(t.sparepart_id)?.nama || '—'}</span>
                        <span className="ml-1 font-mono text-xs text-maroon-900/40">{spMap.get(t.sparepart_id)?.kode || ''}</span>
                      </td>
                      <td className="td">
                        <span className={`stat-chip ${
                          t.tipe_transaksi === 'masuk' ? 'bg-ocean-100 text-ocean-800' : 'bg-maroon-100 text-maroon-700'
                        }`}>
                          {t.tipe_transaksi === 'masuk' ? '📥 Masuk' : '📤 Keluar'}
                        </span>
                      </td>
                      <td className={`td font-bold ${t.tipe_transaksi === 'masuk' ? 'text-ocean-700' : 'text-maroon-700'}`}>
                        {t.tipe_transaksi === 'masuk' ? '+' : '−'}{t.jumlah} unit
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-4 text-center text-xs text-maroon-900/40">
          <p>© {new Date().getFullYear()} Bengkel FAS — Dashboard Inventaris & Logistik</p>
        </footer>
      </div>
    </div>
  )
}