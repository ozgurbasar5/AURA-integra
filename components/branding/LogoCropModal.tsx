'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ZoomIn, Check } from 'lucide-react'

interface Props {
  open: boolean
  imageSrc: string
  onClose: () => void
  onApply: (croppedDataUrl: string) => void
}

const SIZE = 280

export default function LogoCropModal({ open, imageSrc, onClose, onApply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, SIZE, SIZE)
    const scale = zoom
    const w = img.width * scale
    const h = img.height * scale
    const x = (SIZE - w) / 2 + offset.x
    const y = (SIZE - h) / 2 + offset.y
    ctx.drawImage(img, x, y, w, h)
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.9)'
    ctx.lineWidth = 2
    ctx.strokeRect(8, 8, SIZE - 16, SIZE - 16)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, SIZE, 8)
    ctx.fillRect(0, SIZE - 8, SIZE, 8)
    ctx.fillRect(0, 0, 8, SIZE)
    ctx.fillRect(SIZE - 8, 0, 8, SIZE)
  }, [zoom, offset])

  useEffect(() => {
    if (!open || !imageSrc) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      draw()
    }
    img.src = imageSrc
  }, [open, imageSrc, draw])

  useEffect(() => { draw() }, [draw])

  function handleApply() {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return
    const out = document.createElement('canvas')
    out.width = 256
    out.height = 256
    const ctx = out.getContext('2d')
    if (!ctx) return
    const scale = zoom
    const w = img.width * scale
    const h = img.height * scale
    const x = (SIZE - w) / 2 + offset.x
    const y = (SIZE - h) / 2 + offset.y
    const crop = 8
    const cropSize = SIZE - 16
    const sx = ((crop - x) / w) * img.width
    const sy = ((crop - y) / h) * img.height
    const sw = (cropSize / w) * img.width
    const sh = (cropSize / h) * img.height
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256)
    onApply(out.toDataURL('image/png', 0.92))
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="modal-header py-4 px-5">
          <h3 className="font-bold flex items-center gap-2"><ZoomIn size={16} /> Logo Kırp</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body py-4 px-5 space-y-4">
          <p className="text-xs text-slate-500">Kare alan vitrin ve menüde kullanılır. Sürükleyerek konumlandırın.</p>
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="mx-auto rounded-xl border border-slate-200 cursor-move touch-none"
            onPointerDown={e => {
              dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={e => {
              if (!dragRef.current) return
              setOffset({
                x: dragRef.current.ox + (e.clientX - dragRef.current.x),
                y: dragRef.current.oy + (e.clientY - dragRef.current.y),
              })
            }}
            onPointerUp={() => { dragRef.current = null }}
          />
          <label className="flex items-center gap-3 text-sm">
            <span className="text-slate-600 shrink-0">Yakınlaştır</span>
            <input type="range" min="0.5" max="2.5" step="0.05" value={zoom}
              onChange={e => setZoom(Number(e.target.value))} className="flex-1" />
          </label>
        </div>
        <div className="modal-footer py-4 px-5 gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">İptal</button>
          <button type="button" onClick={handleApply} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Check size={14} /> Uygula
          </button>
        </div>
      </div>
    </div>
  )
}
