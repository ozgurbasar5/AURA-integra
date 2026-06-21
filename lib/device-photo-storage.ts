/** Cihaz fotoğrafları — Supabase Storage upload (client-side resize + API) */

import { MAX_DEVICE_PHOTOS, MAX_DEVICE_PHOTO_BYTES } from './device-images'

export function isStorageUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/storage/')
}

/** Canvas ile max 1200px, JPEG quality 0.85 */
export async function resizeImageForUpload(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Sadece görsel dosyası yükleyebilirsiniz (PNG/JPG)')
  }
  if (file.size <= MAX_DEVICE_PHOTO_BYTES && file.type === 'image/jpeg') {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const maxDim = 1200
  let { width, height } = bitmap
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas desteklenmiyor')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Görsel sıkıştırılamadı'))),
      'image/jpeg',
      0.85,
    )
  })

  if (blob.size > MAX_DEVICE_PHOTO_BYTES) {
    throw new Error(`Fotoğraf en fazla ${Math.round(MAX_DEVICE_PHOTO_BYTES / 1024)} KB olabilir`)
  }
  return blob
}

export async function uploadDevicePhoto(orderId: string, file: File): Promise<string> {
  const blob = await resizeImageForUpload(file)
  const form = new FormData()
  form.append('file', blob, file.name.replace(/\.\w+$/, '.jpg') || 'photo.jpg')

  const res = await fetch(`/api/service-orders/${orderId}/photos`, {
    method: 'POST',
    credentials: 'same-origin',
    body: form,
  })
  const json = await res.json() as { url?: string; error?: string; images?: string[] }
  if (!res.ok) throw new Error(json.error || 'Yükleme başarısız')
  if (json.url) return json.url
  if (json.images?.length) return json.images[json.images.length - 1]
  throw new Error('Sunucu URL döndürmedi')
}

export async function deleteDevicePhoto(orderId: string, url: string): Promise<string[]> {
  const res = await fetch(`/api/service-orders/${orderId}/photos`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  const json = await res.json() as { images?: string[]; error?: string }
  if (!res.ok) throw new Error(json.error || 'Silme başarısız')
  return json.images ?? []
}

export { MAX_DEVICE_PHOTOS }
