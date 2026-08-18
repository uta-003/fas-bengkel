'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { sfx } from '@/app/lib/sfx'
import { useRouter } from 'next/navigation'
import Logo from '@/app/components/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setMessage({ type: 'success', text: 'Login berhasil! Mengalihkan…' })
      sfx.success()
      setTimeout(() => router.push('/'), 800)
    } catch (error) {
      console.error('Error login:', error)
      sfx.error()
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Gagal login. Periksa email dan password.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      setMessage({
        type: 'success',
        text: 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi, lalu login.',
      })
      sfx.success()
    } catch (error) {
      console.error('Error register:', error)
      sfx.error()
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Gagal registrasi.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-maroon-950 via-maroon-900 to-maroon-700 px-4">
      {/* Dekorasi */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-ocean-500/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="anim-pop rounded-3xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/30">
          {/* Brand */}
          <div className="mb-8 text-center">
                        <Logo size="md" className="mx-auto" />
            <h1 className="mt-4 text-2xl font-extrabold text-maroon-900">
              Bengkel <span className="text-maroon-700">FAS</span>
            </h1>
            <p className="mt-1 text-sm text-maroon-900/60">
              Sistem Keluar Masuk Barang dengan Barcode
            </p>
          </div>

          {message && (
            <div
              className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-ocean-100 text-ocean-900 border border-ocean-200'
                  : 'bg-maroon-100 text-maroon-900 border border-maroon-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
            className="space-y-4"
          >
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="operator@bengkelfas.com"
                className="input"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3 text-base"
            >
              {loading ? 'Memproses…' : mode === 'login' ? '🔐 Masuk' : '📝 Daftar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setMessage(null)
              }}
              className="text-sm font-semibold text-ocean-600 hover:text-ocean-700"
            >
              {mode === 'login'
                ? 'Belum punya akun? Daftar baru'
                : 'Sudah punya akun? Masuk'}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-maroon-900/40">
            © {new Date().getFullYear()} Bengkel FAS
          </p>
        </div>
      </div>
    </main>
  )
}