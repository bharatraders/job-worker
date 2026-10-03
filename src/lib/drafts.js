/**
 * Shared localStorage draft helpers — same pattern as Receive Material
 * (ReceiveMaterialNew.jsx) and Issue Fabric (IssueFabric.jsx).
 *
 * Each form gets its own DRAFT_KEY. Drafts are auto-saved on change,
 * restored on mount with a "Draft restored" banner, and cleared on
 * successful save/submit or explicit discard.
 */

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export function saveDraftState(key, state, hasData) {
  try {
    if (!hasData) {
      localStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, JSON.stringify(state))
  } catch (e) {
    /* ignore quota / private-mode errors */
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    /* ignore */
  }
}
