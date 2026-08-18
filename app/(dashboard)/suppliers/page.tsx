'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import PageHeader from '@/app/components/PageHeader'
import { sfx } from '@/app/lib/sfx'

interface Supplier {
  id: number
  nama: string
  kontak: string
  alamat?: string | null
}

const emptyForm = {
  nama: '',
  kontak: '',
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchSuppliers = useCallback(async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('nama', { ascending: true })
    if (error) {
      console.error('Error mengambil data:', error)
      setMessage({ type: 'error', text: 'Gagal mengambil data supplier.' })
    } else {
      setSuppliers(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSuppliers()
  }, [fetchSuppliers])

  // Sinkron realtime: perubahan dari perangkat lain langsung tampil tanpa perlu refresh
  useEffect(() => {
    const channel = supabase
      .channel('realtime-suppliers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => {
        fetchSuppliers()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSuppliers])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

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
      if (editingId) {
        const { error } = await supabase
          .from('suppliers')
          .update(form)
          .eq('id', editingId)
        if (error) throw error
        setMessage({ type: 'success', text: 'Data supplier berhasil diperbarui.' })
        sfx.success()
      } else {
        const { error } = await supabase.from('suppliers').insert([form])
        if (error) throw error
        setMessage({ type: 'success', text: 'Data supplier berhasil ditambahkan.' })
        sfx.success()
      }
      resetForm()
      fetchSuppliers()
    } catch (error) {
      console.error('Error menyimpan data:', error)
      sfx.error()
      setMessage({ type: 'error', text: 'Gagal menyimpan data supplier.' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: Supplier) => {
    setEditingId(item.id)
    setForm({
      nama: item.nama,
      kontak: item.kontak || '',
    })
    setShowForm(true)
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Yakin ingin menghapus supplier "${nama}"?`)) return
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) {
      console.error('Error menghapus data:', error)
      setMessage({ type: 'error', text: 'Gagal menghapus data supplier.' })
    } else {
      setMessage({ type: 'success', text: `Supplier "${nama}" berhasil dihapus.` })
      sfx.deleted()
      fetchSuppliers()
    }
  }

  const filteredSuppliers = suppliers.filter((item) => {
    const q = search.toLowerCase()
    return (
      item.nama.toLowerCase().includes(q) ||
      (item.kontak || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <PageHeader
        icon="🏭"
        title="Data Supplier"
        subtitle="Kelola pemasok barang bengkel"
      >
        <button
          className="btn-gold"
          onClick={() => {
            resetForm()
            setShowForm(true)
            sfx.toggle()
          }}
        >
          + Tambah Supplier
        </button>
      </PageHeader>

      <div className="mt-6 space-y-5">
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

        {/* Form */}
        {showForm && (
          <div className="anim-pop card border-maroon-900/15 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-maroon-900">
                {editingId ? '✏️ Edit Supplier' : '＋ Tambah Supplier Baru'}
              </h2>
              <button onClick={resetForm} className="btn-ghost">× Tutup</button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nama Perusahaan / Toko *</label>
                <input
                  type="text"
                  name="nama"
                  value={form.nama}
                  onChange={handleInputChange}
                  required
                  placeholder="Contoh: PT Sumber Jaya Motor"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Kontak</label>
                <input
                  type="text"
                  name="kontak"
                  value={form.kontak}
                  onChange={handleInputChange}
                  placeholder="Contoh: 0812-3456-7890"
                  className="input"
                />
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Simpan Supplier'}
                </button>
                <button type="button" onClick={resetForm} className="btn-ghost">Batal</button>
              </div>
            </form>
          </div>
        )}

        {/* Pencarian */}
        <div className="anim-fade-up card flex flex-col gap-3 p-4 sm:flex-row sm:items-center" style={{ animationDelay: '0.05s' }}>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-maroon-900/40">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama supplier atau kontak…"
              className="input pl-10"
            />
          </div>
          <p className="text-sm text-maroon-900/50">{filteredSuppliers.length} supplier terdaftar</p>
        </div>

        {/* Tabel */}
        <div className="anim-fade-up card overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-maroon-900/10">
              <thead className="bg-maroon-900/[0.04]">
                <tr>
                  <th className="thead-th">No</th>
                  <th className="thead-th">Nama Perusahaan</th>
                  <th className="thead-th">Kontak</th>
                  <th className="thead-th">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-maroon-900/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-maroon-900/60">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-maroon-700 border-t-transparent"></div>
                        Memuat data supplier…
                      </div>
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-maroon-900/50">
                      {suppliers.length === 0
                        ? 'Belum ada data supplier. Klik "＋ Tambah Supplier".'
                        : 'Tidak ada supplier yang cocok.'}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((item, index) => (
                    <tr key={item.id} className="transition hover:bg-maroon-50/60">
                      <td className="td text-maroon-900/50">{index + 1}</td>
                      <td className="td">
                        <p className="font-semibold text-maroon-950">{item.nama}</p>
                      </td>
                      <td className="td">
                        {item.kontak ? (
                          <span className="stat-chip bg-ocean-100 text-ocean-800">📞 {item.kontak}</span>
                        ) : (
                          <span className="text-maroon-900/30">-</span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(item)} className="btn-gold px-3 py-1.5 text-xs">
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.nama)}
                            className="btn-danger px-3 py-1.5 text-xs"
                          >
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
        </div>

        {/* Footer */}
        <footer className="pt-4 text-center text-xs text-maroon-900/40">
          <p>© {new Date().getFullYear()} Bengkel FAS — Data Supplier</p>
        </footer>
      </div>
    </div>
  )
}