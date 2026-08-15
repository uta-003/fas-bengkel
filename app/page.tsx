'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

export default function Home() {
  const [spareparts, setSpareparts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fungsi untuk mengambil data dari Supabase saat halaman dibuka
  useEffect(() => {
    async function fetchSpareparts() {
      const { data, error } = await supabase.from('spareparts').select('*')
      if (error) {
        console.error('Error mengambil data:', error)
      } else {
        setSpareparts(data || [])
      }
      setLoading(false)
    }

    fetchSpareparts()
  }, [])

  return (
    <main style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333' }}>📦 Sistem Inventaris Sparepart</h1>
      <p style={{ color: '#666' }}>Daftar stok barang gudang yang terhubung ke Supabase:</p>

      {loading ? (
        <p>Memuat data dari database...</p>
      ) : (
        <table border={1} cellPadding={10} style={{ borderCollapse: 'collapse', width: '100%', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th>Kode SKU</th>
              <th>Nama Sparepart</th>
              <th>Stok</th>
              <th>Harga Jual</th>
            </tr>
          </thead>
          <tbody>
            {spareparts.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>Belum ada data sparepart di tabel database.</td>
              </tr>
            ) : (
              spareparts.map((item, index) => (
                <tr key={index}>
                  <td>{item.kode_sku}</td>
                  <td>{item.nama_sparepart}</td>
                  <td>{item.stok}</td>
                  <td>Rp {item.harga_jual}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </main>
  )
}