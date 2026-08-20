import { useCallback, useEffect, useState } from 'react'

/**
 * Estado respaldado en localStorage. La clave incluye una versión de esquema:
 * al cambiarla, los datos viejos quedan ignorados en vez de romper la app.
 */
export function usePersistedState<T>(key: string, initial: T) {
  const storageKey = `ks-tco-ricoh:v1:${key}`

  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // Cuota llena o almacenamiento bloqueado: la sesión sigue en memoria.
    }
  }, [storageKey, state])

  const reset = useCallback(() => setState(initial), [initial])

  return [state, setState, reset] as const
}
