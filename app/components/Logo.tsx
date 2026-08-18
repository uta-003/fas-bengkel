'use client'

import { useState } from 'react'

type LogoSize = 'sm' | 'md' | 'lg'

const sizeClass: Record<LogoSize, string> = {
  sm: 'h-11 w-11',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
}

const glyphClass: Record<LogoSize, string> = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-4xl',
}

/**
 * Sumber logo, diprioritaskan dari atas:
 * 1. /logo.png  — gambar logo Anda sendiri
 * 2. /logo.svg  — logo bawaan Bengkel FAS
 * 3. 🔧         — fallback glyph (tak pernah gambar rusak)
 */
const LOGO_SOURCES = ['/logo.png', '/logo.svg']

interface LogoProps {
  /** sm = sidebar, md = login, lg = hero */
  size?: LogoSize
  /** Class tambahan, mis. `mx-auto` */
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const [srcIndex, setSrcIndex] = useState(0)

  if (srcIndex < LOGO_SOURCES.length) {
    return (
      <img
        key={LOGO_SOURCES[srcIndex]}
        src={LOGO_SOURCES[srcIndex]}
        alt="Logo Bengkel FAS"
        onError={() => setSrcIndex((i) => i + 1)}
        className={`${sizeClass[size]} rounded-2xl object-cover shadow-lg shadow-black/30 ring-1 ring-white/10 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass[size]} ${glyphClass[size]} flex items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg shadow-black/30 ${className}`}
      aria-label="Logo Bengkel FAS"
    >
      🔧
    </div>
  )
}
