'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import PageHeader from '@/app/components/PageHeader'
import Barcode from '@/app/components/Barcode'
import Link from 'next/link'

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

export default function SparepartDetailClient({ id }: { id: number }) {
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `sparepart_id=eq.${id}`,
        },
        () => {
          fetchData()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'spareparts',
          filter: `id=eq.${id}`,
        },
        () => {
          fetchData()
        },
      )
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-maroon-200 border-t-maroon-800 mb-3"></div>
          <p className="text-sm text-maroon-800/60">Memuat detail barang…</p>
        </div>
      </div>
    )
  }

  if (!sparepart) {
    return (
      <div className="p-8 text-center">
        <p className="text-maroon-800/60">Barang tidak ditemukan.</p>
        <Link href="/dashboard" className="text-ocean-600 hover:underline mt-2 inline-block">
          ← Kembali ke Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-50 to-maroon-100">
            <PageHeader title={sparepart.nama} subtitle="Detail barang & riwayat transaksi" />

      <main className="max-w-4xl mx-auto px-4 pb-24 pt-6">
        {/* Card Utama */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-maroon-900">{sparepart.nama}</h1>
              <p className="text-sm text-maroon-800/60 font-mono mt-1">{sparepart.kode}</p>
              {sparepart.kategori && (
                <p className="text-xs text-ocean-600 font-semibold mt-1">{sparepart.kategori}</p>
              )}
            </div>
            <Link href="/dashboard/sparepart/new" className="text-xs px-3 py-1 bg-ocean-100 text-ocean-800 rounded-full">
              ✏️ Edit
            </Link>
          </div>
        </div>

        {/* Stok Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-xs text-maroon-900/50">Stok Tersedia</p>
            <p className="text-3xl font-extrabold text-ocean-700">{sparepart.stok}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-maroon-900/50">Lokasi</p>
            <p className="text-lg font-bold text-maroon-900">{sparepart.lokasi || '-'}</p>
          </div>
        </div>

        {/* Harga & Laba */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-maroon-900/50">Harga Beli</p>
            <p className="mt-1 text-xl font-extrabold text-maroon-900">{formatRupiah(sparepart.harga_beli)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-maroon-900/50">Harga Jual</p>
            <p className="mt-1 text-xl font-extrabold text-ocean-700">{formatRupiah(sparepart.harga_jual)}</p>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border-2 border-maroon-900/5 bg-maroon-50/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-maroon-900/50">Total Masuk</p>
              <p className="mt-1 text-2xl font-extrabold text-ocean-700">+{totalMasuk} unit</p>
            </div>
            <div className="rounded-xl border-2 border-maroon-900/5 bg-maroon-50/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-maroon-900/50">Total Keluar</p>
              <p className="mt-1 text-2xl font-extrabold text-maroon-700">−{totalKeluar} unit</p>
            </div>
          </div>

          {/* Barcode */}
          <div className="mt-6 text-center">
            <h2 className="text-lg font-extrabold text-maroon-900 mb-3">🏷️ Label Barcode</h2>
            <div className="inline-block rounded-xl bg-white p-4 shadow">
              <Barcode value={sparepart.barcode || sparepart.kode} width={2} height={60} fontSize={12} />
            </div>
            <p className="mt-2 font-mono text-sm font-bold text-maroon-900">{sparepart.barcode || sparepart.kode}</p>
            <p className="mt-1 text-xs text-maroon-900/50">
              Scan label ini di menu <strong>Keluar/Masuk</strong> untuk mencatat stok.
            </p>
            <Link href="/dashboard/transactions" className="btn-primary mt-4 w-full block">
              🔁 Catat Transaksi
            </Link>
          </div>
        </div>

        {/* Potensi Laba */}
        <div className="card p-6 mb-6">
          <div className="rounded-xl border-2 border-dashed border-maroon-900/15 bg-maroon-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-maroon-900/50">Potensi Laba / Unit</p>
            <p className="mt-1 text-2xl font-extrabold text-maroon-900">
              {formatRupiah(sparepart.harga_jual - sparepart.harga_beli)}
            </p>
          </div>
        </div>

        {/* Riwayat transaksi */}
        <div className="card overflow-hidden">
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
                        <span className={`stat-chip ${item.tipe_transaksi === 'masuk' ? 'bg-ocean-100 text-ocean-800' : 'bg-maroon-100 text-maroon-700'}`}>
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
      </main>
    </div>
  )
}