/**
 * Payments feature — API calls for recording payments to job workers.
 * Single-table operations (no RPC needed).
 */
import { supabase } from '../../lib/supabaseClient'

/** Fetch all payments. */
export async function fetchPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

/** Create or update a payment. `id` is omitted on create so Postgres generates a UUID. */
export async function upsertPayment({ id, jobWorkerId, amount, date, notes }) {
  const payload = id
    ? { id, job_worker_id: jobWorkerId, amount, date, notes: notes || '' }
    : { job_worker_id: jobWorkerId, amount, date, notes: notes || '' }
  const query = id
    ? supabase.from('payments').upsert(payload)
    : supabase.from('payments').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw new Error(error.message)
  return data
}

/** Delete a payment. */
export async function deletePayment(id) {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
