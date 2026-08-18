'use client'

import { useState, useEffect } from 'react'
import Sidebar, { SidebarMode } from '@/app/components/Sidebar'

// Shell aplikasi: mengatur mode sidebar + menampilkan konten
export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [mode, setMode] = useState<SidebarMode>('full')

  // Muat preferensi sidebar dari localStorage saat komponen mount
    useEffect(() => {
    try {
      const saved = localStorage.getItem('bengkel-sidebar')
      if (saved === 'full' || saved === 'mini' || saved === 'hidden') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMode(saved)
      }
    } catch {}
  }, [])

  return (
    <div className="min-h-screen">
      <Sidebar mode={mode} onModeChange={setMode} />

      {/* Mobile top bar sudah ada di dalam Sidebar */}
      <main
        className={`transition-[padding] duration-300 ${mode === 'hidden' ? '' : mode === 'mini' ? 'lg:pl-24' : 'lg:pl-64'}`}
      >
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}