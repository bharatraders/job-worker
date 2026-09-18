/**
 * Views feature — queries for derived calculations.
 * These are read-only views computed in Postgres.
 * The frontend just fetches and displays; all math happens in the DB.
 */
import { supabase } from '../../lib/supabaseClient'

/** Fetch live stock view — fabric balance per job-worker. */
export async function fetchLiveStock(filters = {}) {
  let query = supabase
    .from('view_live_stock')
    .select('*')
    .order('job_worker_id')

  if (filters.jobWorkerId) {
    query = query.eq('job_worker_id', filters.jobWorkerId)
  }
  if (filters.fabricId) {
    query = query.eq('fabric_id', filters.fabricId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

/** Fetch group billing view — pieces, amounts, and balances per group. */
export async function fetchGroupBilling() {
  const { data, error } = await supabase
    .from('view_group_billing')
    .select('*')
    .order('job_worker_id')
  if (error) throw new Error(error.message)
  return data
}
