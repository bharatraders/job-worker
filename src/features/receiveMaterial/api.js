/**
 * Receive Material feature — API calls for receiving stitched pieces.
 * Uses the upsert_receive_material RPC for atomic 4-table writes.
 * This is the operation that caused the old data-loss bug — now fully transactional.
 */
import { supabase } from '../../lib/supabaseClient'

/** Fetch all receive entries with nested items, sizes, and part-fabrics. */
export async function fetchReceiveMaterial() {
  const { data, error } = await supabase
    .from('receive_material')
    .select('*, receive_items(*, receive_item_sizes(*), receive_item_part_fabric(*))')
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

/** Create or update a receive material entry via RPC. */
export async function upsertReceiveMaterial(entry) {
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
  return data
}

/** Delete a receive material entry (cascades to items, sizes, part-fabrics). */
export async function deleteReceiveMaterial(id) {
  const { error } = await supabase.from('receive_material').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
