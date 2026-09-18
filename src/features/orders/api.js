/**
 * Orders feature — API calls for orders with expected quantities.
 * Uses the upsert_order RPC for atomic multi-table writes.
 */
import { supabase } from '../../lib/supabaseClient'

/** Fetch all non-deleted orders with their expected quantities. */
export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_expected_qty(*)')
    .is('deleted_at', null)
    .order('date_created', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

/** Fetch a single order by ID with expected quantities. */
export async function fetchOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_expected_qty(*)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Create or update an order via RPC.
 * The RPC handles orders + order_expected_qty atomically.
 */
export async function upsertOrder(orderData) {
  const { data, error } = await supabase.rpc('upsert_order', {
    p_id: orderData.id || null,
    p_date_created: orderData.dateCreated,
    p_job_worker_id: orderData.jobWorkerId,
    p_party_id: orderData.partyId,
    p_item_type_id: orderData.itemTypeId,
    p_group_id: orderData.groupId,
    p_fabric_id: orderData.fabricId || null,
    p_status: orderData.status,
    p_fabric_note: orderData.fabricNote || '',
    p_notes: orderData.notes || '',
    p_expected_qty: Object.entries(orderData.expectedQty || {}).map(([sizeId, qty]) => ({
      sizeId,
      qty,
    })),
  })
  if (error) throw new Error(error.message)
  return data // returns the order UUID
}

/** Soft-delete an order by setting deleted_at. */
export async function softDeleteOrder(id) {
  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
