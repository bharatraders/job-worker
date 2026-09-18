/**
 * Global (mega) search — React port of the "Global Search" from jobwork_v3.html.
 *
 * Searches across Issue Fabric challans, Receive Material challans, Orders,
 * Job Workers and Parties. Each result carries the route + router state needed
 * to land directly on the relevant edit screen (challan/order results open the
 * edit form via the pages' existing `location.state` handling; master results
 * open Masters on the matching tab).
 *
 * The index is fetched once and cached briefly (60s) so repeat searches are
 * instant. All filtering is client-side substring matching, same as the HTML.
 */
import { supabase } from '../../lib/supabaseClient'
import { fmtDate } from '../../lib/format'

const INDEX_LIMIT = 200
const CACHE_TTL_MS = 60 * 1000
const MAX_PER_GROUP = 5

let cache = null
let cacheAt = 0

async function selectOrThrow(query) {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

/** Fetch (and briefly cache) everything the search needs. */
export async function fetchSearchIndex(force = false) {
  if (cache && !force && Date.now() - cacheAt < CACHE_TTL_MS) return cache
  const [issues, receives, orders, jobWorkers, parties, itemTypes, fabrics] = await Promise.all([
    selectOrThrow(supabase.from('issue_fabric').select('*, issue_fabric_blocks(*, issue_fabric_lumps(*))').order('date', { ascending: false }).limit(INDEX_LIMIT)),
    selectOrThrow(supabase.from('receive_material').select('*, receive_items(*, receive_item_sizes(*), receive_item_part_fabric(*))').order('date', { ascending: false }).limit(INDEX_LIMIT)),
    selectOrThrow(supabase.from('orders').select('*, order_expected_qty(*)').is('deleted_at', null).order('date_created', { ascending: false }).limit(INDEX_LIMIT)),
    // Light shape on purpose: group photos are base64 and would bloat the index.
    selectOrThrow(supabase.from('job_workers').select('id, name, phone, groups(id, group_name)').order('name').limit(INDEX_LIMIT)),
    selectOrThrow(supabase.from('parties').select('*').order('name').limit(INDEX_LIMIT)),
    selectOrThrow(supabase.from('item_types').select('*').order('name').limit(INDEX_LIMIT)),
    selectOrThrow(supabase.from('fabrics').select('*').order('name').limit(INDEX_LIMIT)),
  ])
  cache = { issues, receives, orders, jobWorkers, parties, itemTypes, fabrics }
  cacheAt = Date.now()
  return cache
}

/** Invalidate the cached index (call after saves if ultra-fresh results matter). */
export function clearSearchCache() {
  cache = null
  cacheAt = 0
}

function byId(list) {
  const m = new Map()
  ;(list || []).forEach((x) => m.set(x.id, x))
  return m
}

/**
 * Run the global search. Returns a flat list of results in display order:
 * { group, key, main, sub, to, state }.
 */
export async function globalSearch(rawQuery) {
  const q = (rawQuery || '').trim().toLowerCase()
  if (q.length < 2) return []

  const index = await fetchSearchIndex()
  const jwById = byId(index.jobWorkers)
  const partyById = byId(index.parties)
  const itemTypeById = byId(index.itemTypes)
  const fabricById = byId(index.fabrics)
  const results = []

  // ── Issue Fabric challans (challan no, job worker, fabric) ──
  for (const e of index.issues) {
    const jw = jwById.get(e.job_worker_id)
    const challan = (e.challan_no || '').toLowerCase()
    const jwName = (jw?.name || '').toLowerCase()
    const fabricNames = (e.issue_fabric_blocks || [])
      .map((b) => fabricById.get(b.fabric_id)?.name || '')
      .join(' ')
      .toLowerCase()
    if (challan.includes(q) || jwName.includes(q) || fabricNames.includes(q)) {
      results.push({
        group: 'Issue Fabric',
        key: `issue-${e.id}`,
        main: `Challan #${e.challan_no}`,
        sub: `${jw?.name || '?'} · ${fmtDate(e.date)}`,
        to: '/issue-fabric',
        state: { editEntry: e },
      })
    }
  }

  // ── Receive Material challans (challan no, job worker, party, fabric) ──
  for (const e of index.receives) {
    const jw = jwById.get(e.job_worker_id)
    const challan = (e.challan_no || '').toLowerCase()
    const jwName = (jw?.name || '').toLowerCase()
    const partyNames = (e.receive_items || [])
      .map((it) => partyById.get(it.party_id)?.name || '')
      .join(' ')
      .toLowerCase()
    const fabricNames = (e.receive_items || [])
      .flatMap((it) => (it.receive_item_part_fabric || []).map((pf) => fabricById.get(pf.fabric_id)?.name || ''))
      .join(' ')
      .toLowerCase()
    if (challan.includes(q) || jwName.includes(q) || partyNames.includes(q) || fabricNames.includes(q)) {
      results.push({
        group: 'Receive Material',
        key: `receive-${e.id}`,
        main: `Challan #${e.challan_no}`,
        sub: `${jw?.name || '?'} · ${fmtDate(e.date)}`,
        to: '/receive-material/new',
        state: { editEntry: e },
      })
    }
  }

  // ── Orders (party, job worker, item type, fabric) ──
  for (const o of index.orders) {
    const party = partyById.get(o.party_id)
    const jw = jwById.get(o.job_worker_id)
    const it = itemTypeById.get(o.item_type_id)
    const fabric = fabricById.get(o.fabric_id)
    const hay = [party?.name, jw?.name, it?.name, fabric?.name]
    if (hay.some((n) => (n || '').toLowerCase().includes(q))) {
      results.push({
        group: 'Orders',
        key: `order-${o.id}`,
        main: `${party?.name || '?'} — ${it?.name || '?'}`,
        sub: `${jw?.name || '?'} · ${fmtDate(o.date_created)} · ${o.status}`,
        to: '/orders',
        state: { editOrder: o },
      })
    }
  }

  // ── Job Workers (name, phone) ──
  for (const jw of index.jobWorkers) {
    if ((jw.name || '').toLowerCase().includes(q) || (jw.phone || '').includes(q)) {
      const n = (jw.groups || []).length
      results.push({
        group: 'Job Workers',
        key: `jw-${jw.id}`,
        main: jw.name,
        sub: `${jw.phone || 'No phone'} · ${n} group${n !== 1 ? 's' : ''}`,
        to: '/masters',
        state: { tab: 'jobWorkers' },
      })
    }
  }

  // ── Parties (name) ──
  for (const p of index.parties) {
    if ((p.name || '').toLowerCase().includes(q)) {
      results.push({
        group: 'Parties',
        key: `party-${p.id}`,
        main: p.name,
        sub: p.type || '',
        to: '/masters',
        state: { tab: 'parties' },
      })
    }
  }

  return results
}

/** Group a flat result list into labeled sections (max 5 items each). */
export function groupResults(results) {
  const groups = []
  const byGroup = new Map()
  for (const r of results) {
    if (!byGroup.has(r.group)) {
      byGroup.set(r.group, [])
      groups.push({ label: r.group, items: byGroup.get(r.group) })
    }
    if (byGroup.get(r.group).length < MAX_PER_GROUP) byGroup.get(r.group).push(r)
  }
  return groups
}

