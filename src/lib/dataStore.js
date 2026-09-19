/**
 * Central Data Store
 * ==================
 * Single source of in-memory data for the entire app.
 *
 * RULES:
 *   1. ALL data is loaded once on app startup (see DataProvider).
 *   2. Pages READ from the store - no per-page loading spinners.
 *   3. ALL writes go: DB first -> update store ONLY on success.
 *      This makes every operation atomic: either both DB and store
 *      change, or neither does. The DB is always the source of truth.
 *   4. On any write, the store re-fetches the affected record(s) from
 *      the DB and updates itself, so the UI always shows confirmed data.
 */

import { supabase } from './supabaseClient'
import { normalizeJobWorkers } from './sizes'

// --- Initial state ---
const initialState = {
  jobWorkers: [],
  itemTypes: [],
  parties: [],
  fabrics: [],
  partNames: [],
  orders: [],
  issueFabric: [],
  receiveMaterial: [],
  payments: [],
  profiles: [],
  loaded: false,
  loading: false,
  error: null,
}

// --- Reducer ---
function reducer(state, action) {
  switch (action.type) {
    case 'SET_ALL':
      return { ...state, ...action.payload, loaded: true, loading: false, error: null }
    case 'SET_LOADING':
      return { ...state, loading: true, error: null }
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload }
    case 'SET_KEY':
      return { ...state, [action.key]: action.value }
    default:
      return state
  }
}

// --- Pub/Sub ---
let state = initialState
const listeners = new Set()

function getState() {
  return state
}

function setState(newState) {
  state = newState
  listeners.forEach((l) => l(state))
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function dispatch(action) {
  setState(reducer(getState(), action))
}

// --- Data access helpers ---
export const store = {
  getState,
  setState,
  subscribe,
  get: (key) => getState()[key],
}

// --- LOAD ALL DATA (called once on app startup) ---
export async function loadAllData() {
  dispatch({ type: 'SET_LOADING' })
  try {
    const [jobWorkers, itemTypes, parties, fabrics, partNames, orders, issueFabric, receiveMaterial, payments, profiles] = await Promise.all([
      supabase.from('job_workers').select('*, groups(*, group_sizes(*), group_parts(*, group_part_bom(*)))'),
      supabase.from('item_types').select('*').order('name'),
      supabase.from('parties').select('*').order('name'),
      supabase.from('fabrics').select('*').order('name'),
      supabase.from('part_names').select('*').order('name'),
      supabase.from('orders').select('*, order_expected_qty(*)').order('date_created', { ascending: false }),
      supabase.from('issue_fabric').select('*, issue_fabric_blocks(*, issue_fabric_lumps(*))').order('date', { ascending: false }),
      supabase.from('receive_material').select('*, receive_items(*, receive_item_sizes(*), receive_item_part_fabric(*))').order('date', { ascending: false }),
      supabase.from('payments').select('*').order('date', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])

    const errors = [jobWorkers, itemTypes, parties, fabrics, partNames, orders, issueFabric, receiveMaterial, payments, profiles]
      .filter((r) => r.error)

    if (errors.length) {
      throw new Error(errors.map((e) => e.error.message).join('; '))
    }

    dispatch({
      type: 'SET_ALL',
      payload: {
        jobWorkers: normalizeJobWorkers(jobWorkers.data || []),
        itemTypes: itemTypes.data || [],
        parties: parties.data || [],
        fabrics: fabrics.data || [],
        partNames: partNames.data || [],
        orders: orders.data || [],
        issueFabric: issueFabric.data || [],
        receiveMaterial: receiveMaterial.data || [],
        payments: payments.data || [],
        profiles: profiles.data || [],
      },
    })
  } catch (error) {
    dispatch({ type: 'SET_ERROR', payload: error.message })
    throw error
  }
}

// --- Refresh a single table from DB ---
async function refreshTable(table, select, order) {
  let query = supabase.from(table).select(select)
  if (order) query = query.order(order[0], { ascending: order[1] })
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

// --- JOB WORKERS ---
export async function saveJobWorker(jw) {
  const { data, error } = await supabase.rpc('upsert_job_worker', {
    p_id: jw.id || null,
    p_name: jw.name,
    p_phone: jw.phone || '',
    p_groups: (jw.groups || []).map((g) => ({
      id: g.id || null,
      name: g.name,
      itemTypeId: g.itemTypeId,
      sizes: (g.sizes || []).map((s) => ({ id: s.id || null, name: s.name })),
      parts: (g.parts || []).map((p) => ({
        id: p.id || null,
        name: p.name,
        bom: (p.bom || []).map((b) => ({ fabricId: b.fabricId, metresPerPiece: b.metresPerPiece })),
      })),
    })),
  })
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'jobWorkers', value: await refreshTable('job_workers', '*, groups(*, group_sizes(*), group_parts(*, group_part_bom(*)))') })
  return data
}

export async function deleteJobWorker(id) {
  const { error } = await supabase.from('job_workers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'jobWorkers', value: await refreshTable('job_workers', '*, groups(*, group_sizes(*), group_parts(*, group_part_bom(*)))') })
}

// --- ITEM TYPES ---
export async function saveItemType({ id, name }) {
  const query = id ? supabase.from('item_types').upsert({ id, name }) : supabase.from('item_types').insert({ name })
  const { error } = await query
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'itemTypes', value: await refreshTable('item_types', '*', ['name', true]) })
}

export async function deleteItemType(id) {
  const { error } = await supabase.from('item_types').delete().eq('id', id)
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'itemTypes', value: await refreshTable('item_types', '*', ['name', true]) })
}

// --- PARTIES ---
export async function saveParty({ id, name, type }) {
  const payload = id ? { id, name, type } : { name, type }
  const query = id ? supabase.from('parties').upsert(payload) : supabase.from('parties').insert(payload)
  const { error } = await query
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'parties', value: await refreshTable('parties', '*', ['name', true]) })
}

export async function deleteParty(id) {
  const { error } = await supabase.from('parties').delete().eq('id', id)
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'parties', value: await refreshTable('parties', '*', ['name', true]) })
}

// --- FABRICS ---
export async function saveFabric({ id, name }) {
  const query = id ? supabase.from('fabrics').upsert({ id, name }) : supabase.from('fabrics').insert({ name })
  const { error } = await query
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'fabrics', value: await refreshTable('fabrics', '*', ['name', true]) })
}

export async function deleteFabric(id) {
  const { error } = await supabase.from('fabrics').delete().eq('id', id)
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'fabrics', value: await refreshTable('fabrics', '*', ['name', true]) })
}

// --- ORDERS ---
export async function saveOrder(orderData) {
  const { id, partyId, jobWorkerId, itemTypeId, fabricId, status, dateCreated, expectedQty } = orderData
  const orderPayload = id
    ? { id, party_id: partyId, job_worker_id: jobWorkerId, item_type_id: itemTypeId, fabric_id: fabricId, status, date_created: dateCreated }
    : { party_id: partyId, job_worker_id: jobWorkerId, item_type_id: itemTypeId, fabric_id: fabricId, status, date_created: dateCreated }
  const query = id ? supabase.from('orders').upsert(orderPayload) : supabase.from('orders').insert(orderPayload)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  if (expectedQty && expectedQty.length) {
    const orderId = id || data[0].id
    await supabase.from('order_expected_qty').delete().eq('order_id', orderId)
    await supabase.from('order_expected_qty').insert(expectedQty.map((r) => ({ order_id: orderId, size: r.size, qty: r.qty })))
  }
  dispatch({ type: 'SET_KEY', key: 'orders', value: await refreshTable('orders', '*, order_expected_qty(*)', ['date_created', false]) })
  return data
}

export async function deleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'orders', value: await refreshTable('orders', '*, order_expected_qty(*)', ['date_created', false]) })
}

// --- ISSUE FABRIC (uses RPC) ---
export async function saveIssueFabric(entry) {
  const { data, error } = await supabase.rpc('upsert_issue_fabric', {
    p_id: entry.id || null,
    p_challan_no: entry.challanNo,
    p_date: entry.date,
    p_job_worker_id: entry.jobWorkerId,
    p_order_id: entry.orderId || null,
    p_blocks: (entry.fabricBlocks || []).map((b, bIdx) => ({
      id: b.id || null,
      fabricId: b.fabricId,
      sortOrder: bIdx,
      lumps: (b.lumps || []).map((lump) => ({
        id: lump.id || null,
        lumpNo: lump.lumpNo,
        metres: lump.metres,
      })),
    })),
  })
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'issueFabric', value: await refreshTable('issue_fabric', '*, issue_fabric_blocks(*, issue_fabric_lumps(*))', ['date', false]) })
  return data
}

export async function deleteIssueFabric(id) {
  const { error } = await supabase.from('issue_fabric').delete().eq('id', id)
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'issueFabric', value: await refreshTable('issue_fabric', '*, issue_fabric_blocks(*, issue_fabric_lumps(*))', ['date', false]) })
}

// --- RECEIVE MATERIAL (uses RPC) ---
export async function saveReceiveMaterial(entry) {
  const { data, error } = await supabase.rpc('upsert_receive_material', {
    p_id: entry.id || null,
    p_challan_no: entry.challanNo,
    p_date: entry.date,
    p_job_worker_id: entry.jobWorkerId,
    p_order_id: entry.orderId || null,
    p_items: (entry.items || []).map((item, itemIdx) => ({
      id: item.id || null,
      itemTypeId: item.itemTypeId,
      partyId: item.partyId,
      groupId: item.groupId,
      sortOrder: itemIdx,
      sizeWise: Object.entries(item.sizeWise || {}).map(([sizeId, pieces]) => ({
        sizeId,
        pieces,
      })),
      partFabric: Object.entries(item.partFabric || {}).map(([partId, fabricId]) => ({
        partId,
        fabricId,
      })),
    })),
  })
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'receiveMaterial', value: await refreshTable('receive_material', '*, receive_items(*, receive_item_sizes(*), receive_item_part_fabric(*))', ['date', false]) })
  return data
}

export async function deleteReceiveMaterial(id) {
  const { error } = await supabase.from('receive_material').delete().eq('id', id)
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'receiveMaterial', value: await refreshTable('receive_material', '*, receive_items(*, receive_item_sizes(*), receive_item_part_fabric(*))', ['date', false]) })
}

// --- PAYMENTS ---
export async function savePayment({ id, jobWorkerId, amount, date, notes }) {
  const payload = id
    ? { id, job_worker_id: jobWorkerId, amount, date, notes: notes || '' }
    : { job_worker_id: jobWorkerId, amount, date, notes: notes || '' }
  const query = id ? supabase.from('payments').upsert(payload) : supabase.from('payments').insert(payload)
  const { error } = await query
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'payments', value: await refreshTable('payments', '*', ['date', false]) })
}

export async function deletePayment(id) {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'payments', value: await refreshTable('payments', '*', ['date', false]) })
}

// --- PROFILES ---
export async function updateProfile(id, updates) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
  dispatch({ type: 'SET_KEY', key: 'profiles', value: await refreshTable('profiles', '*') })
}

// --- UTILITY ---
export async function refetchAll() {
  await loadAllData()
}
