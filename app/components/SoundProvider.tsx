'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { initAudio, setSfxEnabled, sfx } from '@/app/lib/sfx'

const SoundContext = createContext<{
  enabled: boolean
  toggle: () => void
}>({ enabled: true, toggle: () => {} })

export function useSound() {
  return useContext(SoundContext)
}

export default function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    initAudio()
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    setSfxEnabled(next)
    sfx.toggle()
  }

  return <SoundContext.Provider value={{ enabled, toggle }}>{children}</SoundContext.Provider>
}

