/**
 * Job Workers feature — API calls for job workers with nested groups/sizes/parts/BOM.
 * Uses the upsert_job_worker RPC for atomic 5-table writes.
 */
import { supabase } from '../../lib/supabaseClient'
import { normalizeJobWorkers, sortSizes } from '../../lib/sizes'

/**
 * Fetch all job workers with their full nested structure:
 * worker → groups → sizes → parts → BOM
 */
export async function fetchJobWorkers() {
  const { data, error } = await supabase
    .from('job_workers')
    .select(`
      *,
      groups(
        *,
        group_sizes(*),
        group_parts(*, group_part_bom(*))
      )
    `)
    .order('name')
  if (error) throw new Error(error.message)
  return normalizeJobWorkers(data)
}

/** Create or update a job worker with full nested tree via RPC.
 * Sizes are sorted into garment order BEFORE sending, and sortOrder is
 * derived from that sorted position — so a newly added "32" after "40"
 * automatically lands in the right slot instead of at the end. */
export async function upsertJobWorker(worker) {
  const { data, error } = await supabase.rpc('upsert_job_worker', {
    p_id: worker.id || null,
    p_name: worker.name,
    p_phone: worker.phone || '',
    p_groups: (worker.groups || []).map((group, groupIdx) => ({
      id: group.id || null,
      itemTypeId: group.itemTypeId,
      groupName: group.groupName,
      pieceRate: group.pieceRate,
      photo: group.photo || null,
      sizes: sortSizes(group.sizes || []).map((size, sizeIdx) => ({
        id: size.id || null,
        name: size.name,
        sortOrder: sizeIdx,
      })),
      parts: (group.parts || []).map((part, partIdx) => ({
        id: part.id || null,
        partName: part.partName,
        sortOrder: partIdx,
        bom: Object.entries(part.bom || {}).map(([sizeId, cmPerPiece]) => ({
          sizeId,
          cmPerPiece,
        })),
      })),
    })),
  })
  if (error) throw new Error(error.message)
  return data
}

/** Delete a job worker (cascades to groups, sizes, parts, BOM). */
export async function deleteJobWorker(id) {
  const { error } = await supabase.from('job_workers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Fetch a single job worker with full nested structure (for the edit page). */
export async function fetchJobWorkerById(id) {
  const { data, error } = await supabase
    .from('job_workers')
    .select(`
      *,
      groups(
        *,
        group_sizes(*),
        group_parts(*, group_part_bom(*))
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return normalizeJobWorkers(data ? [data] : [])[0] || data
}
