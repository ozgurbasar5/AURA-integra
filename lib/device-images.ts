/** Atölye cihaz fotoğrafları — PNG/JPG, base64 data URL */

export const MAX_DEVICE_PHOTOS = 8
export const MAX_DEVICE_PHOTO_BYTES = 800_000

export function parseDeviceImages(row: Record<string, unknown>): string[] {
  const direct = row.device_images
  if (Array.isArray(direct)) {
    return direct.filter((x): x is string => typeof x === 'string' && x.length > 0)
  }
  const meta = row.metadata as { device_images?: unknown } | null | undefined
  if (Array.isArray(meta?.device_images)) {
    return meta.device_images.filter((x): x is string => typeof x === 'string' && x.length > 0)
  }
  return []
}

export function readDevicePhotoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Sadece görsel dosyası yükleyebilirsiniz (PNG/JPG)'))
      return
    }
    if (file.size > MAX_DEVICE_PHOTO_BYTES) {
      reject(new Error(`Fotoğraf en fazla ${Math.round(MAX_DEVICE_PHOTO_BYTES / 1024)} KB olabilir`))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })
}
