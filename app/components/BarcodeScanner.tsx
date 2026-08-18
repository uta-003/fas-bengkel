'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Keyboard, ScanLine, X } from 'lucide-react'
import { sfx } from '@/app/lib/sfx'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (value: string) => void
  title?: string
}

interface DetectedBarcode {
  rawValue: string
}

type CamStatus = 'loading' | 'ready' | 'denied' | 'unsupported'

const SUPPORTED_FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'qr_code',
]

/**
 * Scanner barcode berbasis kamera (native BarcodeDetector API — Chrome/Edge/Android)
 * dengan fallback input manual untuk browser lain.
 */
export default function BarcodeScanner({
  open,
  onClose,
  onScan,
  title = 'Scan Barcode',
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<{ detect: (v: HTMLVideoElement) => Promise<DetectedBarcode[]> } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastScanRef = useRef<{ value: string; at: number }>({ value: '', at: 0 })

  const [camStatus, setCamStatus] = useState<CamStatus>('loading')
  const [manual, setManual] = useState('')

  const stopCamera = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const handleDetected = useCallback(
    (rawValue: string) => {
      const now = Date.now()
      // Debounce: abaikan scan ganda dalam jendela 1,5 detik
      if (lastScanRef.current.value === rawValue && now - lastScanRef.current.at < 1500) return
      lastScanRef.current = { value: rawValue, at: now }
      sfx.scan()
      onScan(rawValue.trim())
    },
    [onScan],
  )

  const startCamera = useCallback(async () => {
    stopCamera()
    setCamStatus('loading')

    const BD = (window as Window & { BarcodeDetector?: unknown }).BarcodeDetector
    if (!BD) {
      setCamStatus('unsupported')
      return
    }

    try {
      detectorRef.current = new (BD as new (opts?: { formats: string[] }) => {
        detect: (v: HTMLVideoElement) => Promise<DetectedBarcode[]>
      })({ formats: SUPPORTED_FORMATS })
    } catch {
      // Sebagian browser menolak daftar format — coba tanpa opsi
      try {
        detectorRef.current = new (BD as new () => {
          detect: (v: HTMLVideoElement) => Promise<DetectedBarcode[]>
        })()
      } catch {
        detectorRef.current = null
      }
    }
    if (!detectorRef.current) {
      setCamStatus('unsupported')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamStatus('ready')
        timerRef.current = setInterval(async () => {
          const video = videoRef.current
          if (!video || !detectorRef.current) return
          try {
            const codes = await detectorRef.current.detect(video)
            if (codes.length > 0) handleDetected(codes[0].rawValue)
          } catch {
            // frame gagal diproses — lanjutkan ke frame berikutnya
          }
        }, 150)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCamStatus('denied')
    }
  }, [stopCamera, handleDetected])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setManual('')
      startCamera()
    } else {
      stopCamera()
      setCamStatus('loading')
    }
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const value = manual.trim()
    if (!value) return
    sfx.scan()
    onScan(value.toUpperCase())
    setManual('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="card w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-maroon-900 to-maroon-800 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-white">
            <ScanLine className="h-5 w-5 text-gold-400" /> {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
            title="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Area kamera */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-maroon-900/20 bg-maroon-950/5">
            {camStatus === 'loading' && (
              <div className="flex h-64 items-center justify-center text-maroon-900/60">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-maroon-700 border-t-transparent"></div>
                  Menyalakan kamera…
                </div>
              </div>
            )}
            {camStatus === 'ready' && (
              <>
                <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-1/2 h-40 w-56 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-gold-500/80"></div>
                  <div className="scan-line absolute inset-x-4 h-0.5 rounded-full bg-gradient-to-r from-transparent via-gold-400 to-transparent shadow-[0_0_12px_rgba(224,159,62,0.9)]"></div>
                </div>
              </>
            )}
            {camStatus === 'denied' && (
              <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
                <Camera className="h-10 w-10 text-maroon-700/60" />
                <p className="text-sm font-semibold text-maroon-900">Izin kamera ditolak.</p>
                <p className="text-xs text-maroon-900/60">
                  Izinkan akses kamera di browser, atau gunakan kolom ketik manual di bawah.
                </p>
              </div>
            )}
            {camStatus === 'unsupported' && (
              <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
                <ScanLine className="h-10 w-10 text-maroon-700/60" />
                <p className="text-sm font-semibold text-maroon-900">
                  Scan kamera belum didukung browser ini.
                </p>
                <p className="text-xs text-maroon-900/60">
                  Gunakan Chrome / Edge terbaru (atau Android) — atau ketik kode manual di bawah.
                </p>
              </div>
            )}
          </div>

          {/* Input manual (fallback) */}
          <form onSubmit={submitManual} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-maroon-900/40">
                <Keyboard className="h-4 w-4" />
              </span>
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="…atau ketik kode SKU / IN-… / OUT-… lalu Enter"
                className="input pl-10"
                autoFocus
              />
            </div>
            <button type="submit" className="btn-ocean">
              Cari
            </button>
          </form>

          <p className="mt-3 text-center text-xs text-maroon-900/50">
            Arahkan kamera ke label barcode — terbaca otomatis.
          </p>
        </div>
      </div>
    </div>
  )
}
