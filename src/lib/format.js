/**
 * Formatting helpers — mirrors the old app's fmtNum and fmtDate exactly
 * so numbers and dates look identical in the new UI.
 */

/** Format a number with Indian locale, up to `dp` decimal places. */
export function fmtNum(n, dp = 2) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  return Number(n).toLocaleString('en-IN', {
    maximumFractionDigits: dp,
    minimumFractionDigits: 0,
  })
}

/** Format a date string into DD-Mon-YYYY (Indian locale). */
export function fmtDate(d) {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Get today's date as YYYY-MM-DD string. */
export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * @deprecated DO NOT use for Supabase `id` columns — they are UUID
 * (see schems.md). Sending e.g. "it_xxx" causes Postgres error 22P02
 * "invalid input syntax for type uuid". For creates, omit `id` and let
 * Postgres `gen_random_uuid()` generate it. Kept only for legacy local keys.
 */
export function nextId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
