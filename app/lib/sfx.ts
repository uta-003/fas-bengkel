/**
 * Sound Effects — Web Audio API (tanpa file audio eksternal).
 * Semua suara disintesis secara real-time oleh AudioContext.
 */

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = typeof window !== 'undefined'
      ? window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      : AudioContext
    ctx = new Ctor()
  }
  return ctx
}

function playOscillator(freq: number, dur: number, type: OscillatorType = 'sine') {
  try {
    const c = getCtx()
    if (c.state === 'suspended') c.resume()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.05, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + dur)
  } catch {}
}

export function initAudio() {
  try {
    const c = getCtx()
    if (c.state === 'suspended') c.resume()
  } catch {}
}

let enabled = true

export function isSfxEnabled() {
  return enabled
}

export function setSfxEnabled(v: boolean) {
  enabled = v
}

export const sfx = {
  click: () => playOscillator(440, 0.05, 'square'),
  success: () => {
    playOscillator(660, 0.08, 'sine')
    setTimeout(() => playOscillator(880, 0.12, 'sine'), 80)
  },
  error: () => {
    playOscillator(330, 0.3, 'square')
    setTimeout(() => playOscillator(220, 0.3, 'square'), 220)
  },
  scan: () => {
    playOscillator(220, 0.03, 'square')
    setTimeout(() => playOscillator(330, 0.03, 'square'), 25)
    setTimeout(() => playOscillator(440, 0.05, 'sine'), 50)
    setTimeout(() => playOscillator(660, 0.05, 'sine'), 70)
    setTimeout(() => playOscillator(880, 0.1, 'sine'), 90)
  },
  warning: () => {
    playOscillator(560, 0.1, 'triangle')
    setTimeout(() => playOscillator(560, 0.1, 'triangle'), 150)
    setTimeout(() => playOscillator(780, 0.12, 'sine'), 320)
  },
  printed: () => playOscillator(1200, 0.06, 'square'),
  open: () => playOscillator(440, 0.06, 'sine'),
  close: () => playOscillator(330, 0.06, 'sine'),
  toggle: () => playOscillator(520, 0.07, 'sine'),
  deleted: () => playOscillator(180, 0.35, 'sawtooth'),
}

export function getSfxEnabled() {
  return enabled
}

export function setSfxEnabledState(v: boolean) {
  enabled = v
}

