'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

/**
 * Pengaman rute: jika tidak ada sesi login, arahkan ke /login.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!data.session) {
          router.replace('/login')
        } else {
          setChecking(false)
        }
      })
      .catch(() => router.replace('/login'))
  }, [router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-maroon-950 via-maroon-900 to-maroon-700">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-gold-400"></div>
          <p className="text-sm font-semibold text-white/80">Memeriksa sesi…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
