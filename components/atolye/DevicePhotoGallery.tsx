'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2, Upload, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import {
  MAX_DEVICE_PHOTOS,
  MAX_DEVICE_PHOTO_BYTES,
  readDevicePhotoFile,
} from '@/lib/device-images'
import {
  uploadDevicePhoto,
  deleteDevicePhoto,
  isStorageUrl,
} from '@/lib/device-photo-storage'

interface DevicePhotoGalleryProps {
  images: string[]
  onChange: (images: string[]) => void
  disabled?: boolean
  /** Storage upload için servis kaydı id — verilirse URL olarak yüklenir */
  orderId?: string
}

export default function DevicePhotoGallery({
  images,
  onChange,
  disabled,
  orderId,
}: DevicePhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const atLimit = images.length >= MAX_DEVICE_PHOTOS
  const useStorage = Boolean(orderId)

  async function addFiles(fileList: FileList | File[]) {
    if (disabled || uploading) return
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    if (!files.length) {
      toast.error('Geçerli bir görsel seçin')
      return
    }

    const remaining = MAX_DEVICE_PHOTOS - images.length
    if (remaining <= 0) {
      toast.warning(`En fazla ${MAX_DEVICE_PHOTOS} fotoğraf eklenebilir`)
      return
    }

    setUploading(true)
    const next = [...images]
    try {
      for (const file of files.slice(0, remaining)) {
        if (useStorage && orderId) {
          const url = await uploadDevicePhoto(orderId, file)
          next.push(url)
        } else {
          const dataUrl = await readDevicePhotoFile(file)
          next.push(dataUrl)
        }
      }
      onChange(next)
      if (files.length > remaining) {
        toast.warning(`Yalnızca ${remaining} fotoğraf eklendi (limit: ${MAX_DEVICE_PHOTOS})`)
      } else {
        toast.success('Fotoğraf eklendi')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yükleme başarısız')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function removeAt(index: number) {
    if (disabled) return
    const url = images[index]
    if (useStorage && orderId && isStorageUrl(url)) {
      try {
        const remaining = await deleteDevicePhoto(orderId, url)
        onChange(remaining)
        toast.success('Fotoğraf kaldırıldı')
        return
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Silme başarısız')
        return
      }
    }
    onChange(images.filter((_, i) => i !== index))
    toast.success('Fotoğraf kaldırıldı')
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Camera size={13} className="text-sky-500" />
            Cihaz Fotoğrafları
          </p>
          <span className="text-[10px] text-[var(--text-muted)]">
            {images.length}/{MAX_DEVICE_PHOTOS} · max {Math.round(MAX_DEVICE_PHOTO_BYTES / 1024)} KB
            {useStorage && ' · bulut'}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((src, index) => (
            <div
              key={`${index}-${src.slice(0, 32)}`}
              className="group relative aspect-square rounded-xl overflow-hidden border border-[var(--bg-border)] bg-[var(--bg-muted)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Cihaz fotoğrafı ${index + 1}`} className="w-full h-full object-cover" />
              {!disabled && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setPreview(src)}
                    className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-white"
                    title="Büyüt"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeAt(index)}
                    className="p-1.5 rounded-lg bg-red-500/90 text-white hover:bg-red-600"
                    title="Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {!disabled && !atLimit && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                void addFiles(e.dataTransfer.files)
              }}
              className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
                dragOver
                  ? 'border-sky-400 bg-sky-500/10 text-sky-600'
                  : 'border-[var(--bg-border)] text-[var(--text-muted)] hover:border-sky-400/60 hover:bg-sky-500/5'
              }`}
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin text-sky-500" />
              ) : (
                <>
                  <Upload size={18} />
                  <span>Ekle</span>
                </>
              )}
            </button>
          )}
        </div>

        {!disabled && (
          <label className="btn-secondary btn-sm cursor-pointer inline-flex items-center gap-1.5">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {uploading ? 'Yükleniyor...' : 'Fotoğraf Seç'}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              capture="environment"
              multiple
              className="hidden"
              disabled={uploading || atLimit}
              onChange={e => {
                if (e.target.files?.length) void addFiles(e.target.files)
              }}
            />
          </label>
        )}

        {images.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            Kabul anında cihazın ön/arka ve hasarlı bölgelerinin fotoğrafını ekleyin.
          </p>
        )}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Cihaz fotoğrafı" className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain" />
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 btn-sm bg-white/90 text-slate-800"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  )
}
