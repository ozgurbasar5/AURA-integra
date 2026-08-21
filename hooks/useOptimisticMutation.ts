import { useState, useCallback } from 'react'

export interface OptimisticMutationOptions<TState, TResult> {
  onMutate: (optimisticUpdate: (prev: TState) => TState) => void
  mutationFn: () => Promise<TResult>
  onError?: (error: Error, rollback: () => void) => void
  onSuccess?: (result: TResult) => void
}

export function useOptimisticMutation<TState, TResult>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(
    async (
      currentState: TState,
      optimisticStateProducer: (prev: TState) => TState,
      options: OptimisticMutationOptions<TState, TResult>
    ): Promise<{ ok: boolean; result?: TResult; error?: Error }> => {
      setLoading(true)
      setError(null)

      const previousState = currentState

      // 1. Optimistic Update (Anında arayüz tepkisi)
      options.onMutate(optimisticStateProducer)

      const rollback = () => {
        options.onMutate(() => previousState)
      }

      try {
        // 2. Arka planda gerçek mutation işlemi
        const result = await options.mutationFn()
        options.onSuccess?.(result)
        return { ok: true, result }
      } catch (err) {
        // 3. Hata durumunda rollback & kullanıcı bildirimi
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        rollback()
        options.onError?.(errorObj, rollback)
        return { ok: false, error: errorObj }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    execute,
    loading,
    error,
  }
}
