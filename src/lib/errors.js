/**
 * Error normalization helpers.
 * Supabase errors come in different shapes depending on the call path.
 * These helpers extract a clean, user-friendly message consistently.
 */

/** Normalize any Supabase/JS error into a single display string. */
export function normalizeError(err) {
  if (!err) return 'An unknown error occurred.'
  if (typeof err === 'string') return err
  // Supabase PostgREST error
  if (err.message) return err.message
  // Fallback
  return 'An unexpected error occurred.'
}

/** Check if an error is an auth-related failure (wrong credentials, etc). */
export function isAuthError(err) {
  if (!err) return false
  const msg = (err.message || '').toLowerCase()
  return msg.includes('invalid') || msg.includes('auth') || msg.includes('credentials')
}
