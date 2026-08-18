'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import PageHeader from '@/app/components/PageHeader'
import Barcode from '@/app/components/Barcode'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Sparepart {
  id: number
  kode: string
  nama: string
  kategori?: string | null
  stok: number
  harga_beli: number
  harga_jual: number
  lokasi?: string | null
  barcode?: string | null
}

interface Transaction {
  id: number
  tipe_transaksi: string | null
  created_at: string
  jumlah: number
  sparepart_id: number
}

export default function SparepartDetailPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params.id)

  const [sparepart, setSparepart] = useState<Sparepart | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [spResult, txResult] = await Promise.all([
      supabase.from('spareparts').select('*').eq('id', id).single(),
      supabase
        .from('transactions')
        .select('*')
        .eq('sparepart_id', id)
        .order('created_at', { ascending: false }),
    ])
    if (spResult.error) {
      console.error('Error sparepart:', spResult.error)
    } else {
      setSparepart(spResult.data)
    }
    if (txResult.error) {
      console.error('Error transactions:', txResult.error)
    } else {
      setTransactions(txResult.data || [])
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  // Sinkron realtime: transaksi/stok terbaru dari perangkat lain langsung tampil
  useEffect(() => {
    const channel = supabase
      .channel('realtime-sparepart-detail')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `sparepart_id=eq.${id}` }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'spareparts', filter: `id=eq.${id}` }, () => {
        fetchData()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData, id])

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num)

  const formatTanggal = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const totalMasuk = transactions
    .filter((t) => t.tipe_transaksi === 'masuk')
    .reduce((s, t) => s + t.jumlah, 0)
  const totalKeluar = transactions
    .filter((t) => t.tipe_transaksi === 'keluar')
    .reduce((s, t) => s + t.jumlah, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-maroon-900/60">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-maroon-700 border-t-transparent"></div>
        Memuat data…
      </div>
    )
  }

  if (!sparepart) {
    return (
      <div className="py-16 text-center">
        <p className="text-maroon-900/60">Barang tidak ditemukan.</p>
        <Link href="/" className="btn-primary mt-4">
          ← Kembali ke Inventaris
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <Link href="/" className="text-sm font-semibold text-ocean-600 hover:text-ocean-700">
          ← Kembali ke Inventaris
        </Link>
      </div>
      <PageHeader
        icon="🔍"
        title={sparepart.nama}
        subtitle={`Detail barang • ${sparepart.kode}`}
      >
        <span className={`stat-chip ${
          sparepart.stok <= 0
            ? 'bg-maroon-700 text-white'
            : sparepart.stok <= 5
              ? 'bg-gold-400 text-maroon-950'
              : 'bg-ocean-100 text-ocean-800'
        }`}>
          {sparepart.stok <= 0 ? 'Stok Habis' : `Stok: ${sparepart.stok} unit`}
        </span>
      </PageHeader>

      <div className="mt-6 space-y-5">
        {/* Ringkasan + barcode */}
        <div className="anim-fade-up grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-lg font-extrabold text-maroon-900">Informasi Barang</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold text-maroon-900/50">Kategori</p>
                <p className="mt-1 text-sm font-semibold text-maroon-950">{sparepart.kategori || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-maroon-900/50">Lokasi</p>
                <p className="mt-1 text-sm font-semibold text-maroon-950">{sparepart.lokasi || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-maroon-900/50">Harga Beli</p>
                <p className="mt-1 text-sm font-semibold text-maroon-950">{formatRupiah(sparepart.harga_beli)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-maroon-900/50">Harga Jual</p>
                <p className="mt-1 text-sm font-semibold text-maroon-950">{formatRupiah(sparepart.harga_jual)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-maroon-900/50">Total Masuk</p>
                <p className="mt-1 text-sm font-semibold text-ocean-700">+{totalMasuk} unit</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-maroon-900/50">Total Keluar</p>
                <p className="mt-1 text-sm font-semibold text-maroon-700">−{totalKeluar} unit</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border-2 border-dashed border-maroon-900/15 bg-maroon-50/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-maroon-900/50">
                Potensi Laba / Unit
              </p>
              <p className="mt-1 text-2xl font-extrabold text-maroon-900">
                {formatRupiah(sparepart.harga_jual - sparepart.harga_beli)}
              </p>
            </div>
          </div>

          {/* Barcode */}
          <div className="card p-6">
            <h2 className="text-lg font-extrabold text-maroon-900">🏷️ Label Barcode</h2>
            <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
              <Barcode value={sparepart.barcode || sparepart.kode} width={2} height={60} fontSize={12} />
            </div>
            <p className="mt-2 text-center font-mono text-sm font-bold text-maroon-900">{sparepart.barcode || sparepart.kode}</p>
            <p className="mt-1 text-center text-xs text-maroon-900/50">
              Scan label ini di menu <strong>Keluar/Masuk</strong> untuk mencatat stok.
            </p>
            <Link href="/transactions" className="btn-primary mt-4 w-full">
              🔁 Catat Transaksi
            </Link>
          </div>
        </div>

        {/* Riwayat transaksi */}
        <div className="anim-fade-up card overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <div className="px-6 py-4">
            <h2 className="text-lg font-extrabold text-maroon-900">📋 Riwayat Transaksi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-maroon-900/10">
              <thead className="bg-maroon-900/[0.04]">
                <tr>
                  <th className="thead-th">Tanggal</th>
                  <th className="thead-th">Tipe</th>
                  <th className="thead-th">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-maroon-900/5">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-maroon-900/50">
                      Belum ada transaksi untuk barang ini.
                    </td>
                  </tr>
                ) : (
                  transactions.map((item) => (
                    <tr key={item.id} className="transition hover:bg-maroon-50/60">
                      <td className="td text-maroon-900/70">{formatTanggal(item.created_at)}</td>
                      <td className="td">
                        <span className={`stat-chip ${
                          item.tipe_transaksi === 'masuk' ? 'bg-ocean-100 text-ocean-800' : 'bg-maroon-100 text-maroon-700'
                        }`}>
                          {item.tipe_transaksi === 'masuk' ? '📥 Masuk' : '📤 Keluar'}
                        </span>
                      </td>
                      <td className={`td font-bold ${item.tipe_transaksi === 'masuk' ? 'text-ocean-700' : 'text-maroon-700'}`}>
                        {item.tipe_transaksi === 'masuk' ? '+' : '−'}{item.jumlah} unit
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
          <p>© {new Date().getFullYear()} Bengkel FAS — Detail Barang</p>
        </footer>
      </div>
    </div>
  )
}