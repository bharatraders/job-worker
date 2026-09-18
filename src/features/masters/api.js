/**
 * Masters feature — API calls for item types, parties, fabrics, part names.
 * Simple CRUD operations on single tables (no RPC needed).
 */
import { supabase } from '../../lib/supabaseClient'

// ── Item Types ─────────────────────────────────────────────────────
export async function fetchItemTypes() {
  const { data, error } = await supabase
    .from('item_types')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

// NOTE: `id` columns are UUID with `gen_random_uuid()` default in Postgres.
// Never send a client-generated string like "it_xxx" — Postgres rejects it
// with 22P02 "invalid input syntax for type uuid". For creates, omit `id`
// entirely so the DB generates a real UUID. Only pass `id` when updating
// an existing row (which will already be a valid UUID from a prior fetch).
export async function upsertItemType({ id, name }) {
  const payload = id ? { id, name } : { name }
  const query = id
    ? supabase.from('item_types').upsert(payload)
    : supabase.from('item_types').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteItemType(id) {
  const { error } = await supabase.from('item_types').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Parties ────────────────────────────────────────────────────────
export async function fetchParties() {
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function upsertParty({ id, name, type }) {
  const payload = id ? { id, name, type } : { name, type }
  const query = id
    ? supabase.from('parties').upsert(payload)
    : supabase.from('parties').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteParty(id) {
  const { error } = await supabase.from('parties').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Fabrics ────────────────────────────────────────────────────────
export async function fetchFabrics() {
  const { data, error } = await supabase
    .from('fabrics')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function upsertFabric({ id, name }) {
  const payload = id ? { id, name } : { name }
  const query = id
    ? supabase.from('fabrics').upsert(payload)
    : supabase.from('fabrics').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteFabric(id) {
  const { error } = await supabase.from('fabrics').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Part Names ─────────────────────────────────────────────────────
export async function fetchPartNames() {
  const { data, error } = await supabase
    .from('part_names')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function upsertPartName({ id, name }) {
  const payload = id ? { id, name } : { name }
  const query = id
    ? supabase.from('part_names').upsert(payload)
    : supabase.from('part_names').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deletePartName(id) {
  const { error } = await supabase.from('part_names').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
