/**
 * Garment size ordering — single source of truth for size display order.
 *
 * Problem it fixes: group_sizes.sort_order was just "insertion index"
 * (size added last got the biggest sort_order), so a group could end up
 * as 44, 32, 34, 36, 38, 40, 42. Every screen renders sizes in group
 * order, so the distortion showed up in Masters, Orders, Receive Material, etc.
 *
 * Rule:
 *  1. The exact reference sequence the user gave is honoured verbatim
 *     whenever both names are in it:
 *     34, 36, 38, 38/30, 38/32, 40/30, 40/32, 40/34, 40/36, 40,
 *     42, 42/32, 42/34, 42/36, 42/38, 42/40
 *     (note: 38-plain sorts BEFORE its combos, 40-plain sorts AFTER
 *     its combos — exactly as specified, not a plain-first/last rule).
 *  2. Anything else (22, 24, 32, 44, S/M/L, ...) falls back to a natural
 *     numeric sort: first number ascending, then second number ascending,
 *     plain (no "/") first within its number. So 32 < 34 < 44 always.
 */

const REFERENCE_ORDER = [
  '34', '36', '38', '38/30', '38/32',
  '40/30', '40/32', '40/34', '40/36', '40',
  '42', '42/32', '42/34', '42/36', '42/38', '42/40',
]

const RANK = new Map(REFERENCE_ORDER.map((n, i) => [n.toLowerCase(), i]))

function splitParts(name) {
  return String(name ?? '')
    .trim()
    .split('/')
    .map((p) => {
      const t = p.trim()
      const n = t !== '' && !Number.isNaN(Number(t)) ? Number(t) : null
      return { t, n }
    })
}

function compareNatural(an, bn) {
  const ap = splitParts(an)
  const bp = splitParts(bn)
  const len = Math.min(ap.length, bp.length)
  for (let i = 0; i < len; i++) {
    const a = ap[i]
    const b = bp[i]
    if (a.n !== null && b.n !== null) {
      if (a.n !== b.n) return a.n - b.n
    } else if (a.n !== null || b.n !== null) {
      // numeric part sorts before non-numeric ("32" before "S")
      return a.n !== null ? -1 : 1
    } else {
      const c = a.t.localeCompare(b.t, undefined, { numeric: true, sensitivity: 'base' })
      if (c !== 0) return c
    }
  }
  // all shared parts equal → shorter (plain "40") before longer ("40/30")
  if (ap.length !== bp.length) return ap.length - bp.length
  return String(an).localeCompare(String(bn), undefined, { numeric: true, sensitivity: 'base' })
}

/** Compare two size NAME strings. */
export function compareSizeNames(a, b) {
  const an = String(a ?? '').trim()
  const bn = String(b ?? '').trim()
  if (an === bn) return 0
  const ar = RANK.get(an.toLowerCase())
  const br = RANK.get(bn.toLowerCase())
  if (ar !== undefined && br !== undefined) return ar - br
  return compareNatural(an, bn)
}

/** Sort an array of size objects ({name, ...}) — returns a NEW array. */
export function sortSizes(arr) {
  return [...(arr || [])].sort(
    (x, y) =>
      compareSizeNames(x?.name, y?.name) ||
      (x?.sort_order ?? 0) - (y?.sort_order ?? 0)
  )
}

/**
 * Sort every group's group_sizes in a jobWorkers array IN PLACE.
 * Call right after any fetch so ALL screens (Masters, Orders,
 * Receive Material, History cards) see the same correct order.
 */
export function normalizeJobWorkers(workers) {
  for (const jw of workers || []) {
    for (const g of jw.groups || []) {
      if (Array.isArray(g.group_sizes)) {
        g.group_sizes.sort(
          (x, y) =>
            compareSizeNames(x?.name, y?.name) ||
            (x?.sort_order ?? 0) - (y?.sort_order ?? 0)
        )
      }
    }
  }
  return workers
}
