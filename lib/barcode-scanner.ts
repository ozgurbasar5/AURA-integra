/**
 * Unified barcode scanning: native BarcodeDetector when available,
 * html5-qrcode fallback for iOS Safari and older browsers.
 */

export const BARCODE_FORMATS = ['ean_13', 'ean_8', 'code_128', 'qr_code'] as const

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
  detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
}

export function hasBarcodeDetector(): boolean {
  if (typeof window === 'undefined') return false
  return 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia
}

export function hasCameraSupport(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

function getDetector(): InstanceType<BarcodeDetectorCtor> | null {
  if (typeof window === 'undefined') return null
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  if (!Ctor) return null
  return new Ctor({ formats: [...BARCODE_FORMATS] })
}

/** Request rear camera stream */
export async function getCameraStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  })
}

/**
 * BarcodeDetector loop on a <video> element.
 * Returns cleanup function.
 */
export function startBarcodeDetectorLoop(
  video: HTMLVideoElement,
  onScan: (code: string) => void,
): () => void {
  const detector = getDetector()
  if (!detector) return () => {}

  let rafId: number | null = null
  let stopped = false

  const tick = async () => {
    if (stopped || !video) return
    try {
      const codes = await detector.detect(video)
      const raw = codes[0]?.rawValue
      if (raw) {
        onScan(raw.trim())
        return
      }
    } catch {
      /* frame skip */
    }
    rafId = requestAnimationFrame(tick)
  }

  rafId = requestAnimationFrame(tick)

  return () => {
    stopped = true
    if (rafId !== null) cancelAnimationFrame(rafId)
  }
}

type Html5QrcodeModule = typeof import('html5-qrcode')

let html5Module: Html5QrcodeModule | null = null

async function loadHtml5Qrcode(): Promise<Html5QrcodeModule> {
  if (!html5Module) {
    html5Module = await import('html5-qrcode')
  }
  return html5Module
}

/**
 * html5-qrcode scanner — works on iOS Safari.
 * Returns async cleanup function.
 */
export async function startHtml5QrcodeScanner(
  containerId: string,
  onScan: (code: string) => void,
): Promise<() => Promise<void>> {
  const { Html5Qrcode } = await loadHtml5Qrcode()
  const scanner = new Html5Qrcode(containerId, { verbose: false })

  await scanner.start(
    { facingMode: 'environment' },
    {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const w = Math.min(viewfinderWidth * 0.85, 280)
        const h = Math.min(viewfinderHeight * 0.5, 160)
        return { width: w, height: h }
      },
      aspectRatio: 1.777,
    },
    (decodedText) => onScan(decodedText.trim()),
    () => { /* per-frame miss */ },
  )

  return async () => {
    try {
      await scanner.stop()
      scanner.clear()
    } catch {
      /* already stopped */
    }
  }
}

export function normalizeScanValue(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 15) return digits.slice(0, 15)
  return trimmed
}
