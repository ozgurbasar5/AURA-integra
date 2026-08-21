import { useState, useCallback } from 'react'

/**
 * useActionLock — Çoklu tıklama / mükerrer submit engelleme kilit kancası.
 *
 * Kullanıcı butona hızlıca 2. veya 3. kez bastığında async işlem tamamlanana kadar
 * sonraki tıklamaları anında yok sayar (no-op).
 */
export function useActionLock() {
  const [locked, setLocked] = useState(false)

  const lockAction = useCallback(
    async <T>(actionFn: () => Promise<T>): Promise<T | null> => {
      if (locked) return null

      setLocked(true)
      try {
        const result = await actionFn()
        return result
      } finally {
        setLocked(false)
      }
    },
    [locked]
  )

  return {
    locked,
    lockAction,
  }
}
