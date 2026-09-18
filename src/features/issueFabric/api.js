/**
 * Issue Fabric feature — API calls for fabric issuance challans.
 * Uses the upsert_issue_fabric RPC for atomic writes across 3 tables.
 */
import { supabase } from '../../lib/supabaseClient'

/** Fetch all issue fabric entries with nested blocks and lumps. */
export async function fetchIssueFabric() {
  const { data, error } = await supabase
    .from('issue_fabric')
    .select('*, issue_fabric_blocks(*, issue_fabric_lumps(*))')
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

/** Create or update an issue fabric entry via RPC. */
export async function upsertIssueFabric(entry) {
  const { data, error } = await supabase.rpc('upsert_issue_fabric', {
    p_id: entry.id || null,
    p_challan_no: entry.challanNo,
    p_date: entry.date,
    p_job_worker_id: entry.jobWorkerId,
    p_order_id: entry.orderId || null,
    p_blocks: (entry.fabricBlocks || []).map((block, blockIdx) => ({
      id: block.id || null,
      fabricId: block.fabricId,
      sortOrder: blockIdx,
      lumps: (block.lumps || []).map((lump) => ({
        id: lump.id || null,
        lumpNo: lump.lumpNo,
        metres: lump.metres,
      })),
    })),
  })
  if (error) throw new Error(error.message)
  return data
}

/** Delete an issue fabric entry (cascades to blocks and lumps). */
export async function deleteIssueFabric(id) {
  const { error } = await supabase.from('issue_fabric').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
