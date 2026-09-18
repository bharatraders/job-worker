/**
 * useApiCall - a generic hook for data fetching with loading/error/data states.
 *
 * STALE-WHILE-REVALIDATE PATTERN:
 *   - If `cacheKey` is provided AND dataStore has data for that key,
 *     render IMMEDIATELY from the store variable (no loading spinner).
 *   - Always fetch fresh data in the BACKGROUND.
 *   - Only update the store if the fresh data DIFFERS from stored data.
 *   - If data is identical -> no re-render, no flicker.
 *
 * Pattern: render from store (instant) -> background fetch -> update only if changed.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { store as dataStore } from '../lib/dataStore'

function readStore(cacheKey) {
  if (!cacheKey) return null
  try {
    const stored = dataStore.get(cacheKey)
    return stored && stored.length > 0 ? stored : null
  } catch {
    return null
  }
}

export function useApiCall(apiFn, deps = [], cacheKey = null) {
  const [data, setData] = useState(() => readStore(cacheKey))
  const [loading, setLoading] = useState(() => (cacheKey ? !readStore(cacheKey) : true))
  const [error, setError] = useState(null)

  const apiFnRef = useRef(apiFn)
  apiFnRef.current = apiFn

  // Live updates: if another page writes to the store, re-render from it.
  useEffect(() => {
    if (!cacheKey) return undefined
    const unsub = dataStore.subscribe((st) => {
      const v = st ? st[cacheKey] : null
      if (v == null) return
      setData((prev) => (JSON.stringify(prev) !== JSON.stringify(v) ? v : prev))
    })
    return unsub
  }, [cacheKey])

  const execute = useCallback(async (...args) => {
    setError(null)
    try {
      const result = await apiFnRef.current(...args)
      const current = cacheKey ? dataStore.get(cacheKey) : null
      if (JSON.stringify(current) !== JSON.stringify(result)) {
        setData(result)
        if (cacheKey) {
          dataStore.setState({ ...dataStore.getState(), [cacheKey]: result })
        }
      } else if (!cacheKey) {
        setData(result)
      }
      return result
    } catch (err) {
      setError(err.message || 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  useEffect(() => {
    execute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute])

  return { data, loading, error, refetch: execute }
}

/**
 * useMutation - for write operations (create/update/delete).
 * Returns { mutate, loading, error }.
 * The caller is responsible for refetching after a successful mutation.
 */
export function useMutation(mutationFn) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function mutate(...args) {
    setLoading(true)
    setError(null)
    try {
      const result = await mutationFn(...args)
      return result
    } catch (err) {
      const msg = err.message || 'Operation failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}
