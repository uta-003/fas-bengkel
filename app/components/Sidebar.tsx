'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/app/lib/supabase'
import { sfx } from '@/app/lib/sfx'
import { Package, BarChart3, Truck, ClipboardList, Menu, Volume2, VolumeX, ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react'
import Logo from '@/app/components/Logo'

export type SidebarMode = 'full' | 'mini' | 'hidden'

interface NavItem {
  href: string
  label: string
  icon: ReactNode
  desc?: string
}

const NAV_GROUPS: { id: string; title: string; items: NavItem[] }[] = [
  {
    id: 'utama',
    title: 'Menu Utama',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" />, desc: 'Ringkasan & grafik' },
      { href: '/', label: 'Inventaris Barang', icon: <Package className="h-5 w-5" />, desc: 'Daftar & label barang' },
    ],
  },
  {
    id: 'operasional',
    title: 'Operasional',
    items: [
      { href: '/transactions', label: 'Keluar / Masuk', icon: <ClipboardList className="h-5 w-5" />, desc: 'Catat transaksi barcode' },
      { href: '/suppliers', label: 'Supplier', icon: <Truck className="h-5 w-5" />, desc: 'Data pemasok' },
    ],
  },
]

// Tombol buka/tutup sidebar di desktop (satu tombol sederhana)
function SidebarToggle({ mode, onModeChange }: { mode: SidebarMode; onModeChange: (m: SidebarMode) => void }) {
  const visible = mode !== 'hidden'
  return (
    <div className="absolute -right-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <button
        onClick={() => onModeChange(visible ? 'hidden' : 'full')}
        title={visible ? 'Tutup sidebar' : 'Buka sidebar'}
        aria-label={visible ? 'Tutup sidebar' : 'Buka sidebar'}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-maroon-900/20 bg-white text-maroon-800 shadow-lg transition hover:bg-maroon-700 hover:text-white"
        data-sfx="off"
      >
        {visible ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  )
}

// Sidebar komponen utama
export default function Sidebar({ mode, onModeChange }: { mode: SidebarMode; onModeChange: (m: SidebarMode) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [openGroup, setOpenGroup] = useState<string | null>('utama')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserEmail(s?.user.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    try { localStorage.setItem('bengkel-sidebar', mode) } catch {}
  }, [mode])

  const handleLogout = async () => {
    sfx.click()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleSound = () => { setSoundOn(!soundOn); sfx.toggle() }
  const toggleGroup = (groupId: string) => { setOpenGroup(openGroup === groupId ? null : groupId); if (mode === 'mini') sfx.toggle() }
  const handleNavigate = () => { if (mobileOpen) setMobileOpen(false) }
  const mini = mode === 'mini'

  return (
    <>
      <SidebarToggle mode={mode} onModeChange={onModeChange} />

      {/* Desktop Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden lg:flex lg:flex-col transition-all duration-300 ease-out ${mode === 'hidden' ? '-translate-x-full' : mode === 'mini' ? 'w-24' : 'w-64'} bg-gradient-to-b from-maroon-900 via-maroon-900 to-maroon-950`}>
        {/* Header */}
        <div className={`flex h-20 shrink-0 items-center border-b border-white/10 pt-4 ${mini ? 'justify-center gap-2 px-1' : 'justify-between gap-3 px-4'}`}>
          <div className="flex min-w-0 items-center gap-3">
            <Logo size="sm" />
            {!mini && (
              <div className="min-w-0">
                <p className="text-lg font-extrabold tracking-tight text-white">Bengkel <span className="text-gold-400">FAS</span></p>
                <p className="text-[11px] font-medium text-maroon-100/70">Keluar Masuk Barang</p>
              </div>
            )}
          </div>
          <button
            onClick={() => onModeChange(mini ? 'full' : 'mini')}
            title={mini ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            aria-label={mini ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-maroon-100 transition hover:bg-gold-500 hover:text-maroon-950"
            data-sfx="off"
          >
            {mini ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>


        {/* Navigation dengan Accordion */}
        <nav className={`sidebar-scroll min-h-0 flex-1 space-y-2 overflow-y-auto py-4 ${mini ? 'flex flex-col items-center' : ''}`}>
          {NAV_GROUPS.map((group) => {
            const isOpen = openGroup === group.id
            return (
              <div key={group.id}>
                {!mini && (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-2 text-sm font-semibold text-maroon-100/60 transition hover:bg-white/5 hover:text-maroon-100/90"
                    data-sfx="off"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      {group.title}
                    </span>
                    <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                )}
                {(mini || isOpen) && (
                  <div className={`space-y-1 ${mini ? '' : 'mt-1 ml-4'}`}>
                    {group.items.map((item) => {
                      const active = pathname === item.href
                      if (mini) {
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            onClick={() => { sfx.click(); handleNavigate() }}
                            className={`flex h-11 w-12 items-center justify-center rounded-xl text-xl transition-all ${active ? 'scale-110 bg-gradient-to-br from-gold-400 to-gold-600 text-maroon-950 shadow-lg' : 'text-maroon-100/70 hover:bg-white/10 hover:text-white'}`}
                          >
                            {item.icon}
                          </Link>
                        )
                      }
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => { sfx.click(); handleNavigate() }}
                          className={`group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${active ? 'bg-white/10 text-gold-400 shadow-inner' : 'text-maroon-100/80 hover:bg-white/5 hover:text-white'}`}
                        >
                          {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold-500 shadow-[0_0_8px_rgba(224,159,62,0.9)]" />}
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                          {!mini && item.desc && <span className="truncate text-[10px] font-normal text-maroon-100/50">{item.desc}</span>}
                          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400" />}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>


        {/* Footer */}
        <div className="border-t border-white/10 p-3">
          {!mini && (
            <button onClick={toggleSound} title={soundOn ? 'Matikan suara' : 'Nyalakan suara'} className={`mb-2 flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${soundOn ? 'bg-white/10 text-gold-400 hover:bg-white/20' : 'bg-white/5 text-maroon-100/40 hover:bg-white/10'}`} data-sfx="off">
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span>{soundOn ? 'Suara Aktif' : 'Suara Mati'}</span>
            </button>
          )}
          {userEmail ? (
            mini ? (
              <div className="flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-xs font-bold text-maroon-950">{userEmail.charAt(0).toUpperCase()}</div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-sm font-bold text-maroon-950">{userEmail.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{userEmail}</p>
                  <p className="text-[10px] text-maroon-100/50">Operator Bengkel</p>
                </div>
                <button onClick={handleLogout} title="Keluar" className="rounded-lg bg-maroon-700/20 p-1.5 transition hover:text-white" data-sfx="off">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )
          ) : (
            <Link href="/login" onClick={() => { sfx.click(); handleNavigate() }} className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-4 py-2.5 text-sm font-bold text-maroon-950 shadow-md transition hover:from-gold-600 hover:to-gold-700 ${mini ? 'h-11 w-11 p-0 text-xl' : ''}`}>
              {mini ? <User className="h-5 w-5" /> : <>🔐 <span>Masuk</span></>}
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-gradient-to-r from-maroon-800 to-maroon-700 px-4 py-2.5 shadow lg:hidden">
        <button onClick={() => { setMobileOpen(true); sfx.open() }} className="text-2xl text-white lg:hidden" aria-label="Buka menu">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <Logo size="sm" className="!h-9 !w-9" />
          <span className="font-bold text-white">Bengkel <span className="text-gold-400">FAS</span></span>
        </div>
        <button onClick={toggleSound} title={soundOn ? 'Matikan suara' : 'Nyalakan suara'} className="rounded-lg bg-white/10 p-1.5 text-sm text-white" data-sfx="off">
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>


      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setMobileOpen(false); sfx.close() }} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-gradient-to-b from-maroon-900 to-maroon-950 shadow-2xl">
            <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5 pt-4">
                            <Logo size="sm" />
              <div>
                <p className="text-lg font-extrabold tracking-tight text-white">Bengkel <span className="text-gold-400">FAS</span></p>
                <p className="text-[11px] font-medium text-maroon-100/70">Keluar Masuk Barang</p>
              </div>
            </div>
            <nav className="pb-4">
              {NAV_GROUPS.map((group) => {
                const isOpen = openGroup === group.id
                return (
                  <div key={group.id}>
                    <button onClick={() => toggleGroup(group.id)} className="flex w-full items-center justify-between rounded-xl px-4 py-2 text-sm font-semibold text-maroon-100/60 transition hover:bg-white/5 hover:text-maroon-100/90" data-sfx="off">
                      <span className="flex items-center gap-2">
                        <span className="text-xs">▸</span>
                        {group.title}
                      </span>
                      <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {isOpen && (
                      <div className="space-y-1 pl-6">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => { sfx.click(); setMobileOpen(false) }}
                            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold ${pathname === item.href ? 'bg-white/10 text-gold-400' : 'text-maroon-100/80 hover:bg-white/5 hover:text-white'}`}
                          >
                            {item.icon}
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
            <div className="border-t border-white/10 p-3">
              {userEmail ? (
                <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-sm font-bold text-maroon-950">{userEmail.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{userEmail}</p>
                    <p className="text-[10px] text-maroon-100/50">Operator Bengkel</p>
                  </div>
                  <button onClick={handleLogout} className="rounded-lg bg-maroon-700/20 p-1.5 text-maroon-100 transition hover:text-white">
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={() => { sfx.click(); setMobileOpen(false) }} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-4 py-2.5 text-sm font-bold text-maroon-950 shadow-md">
                  🔐 <span>Masuk</span>
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

