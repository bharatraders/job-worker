/**
 * Export utilities for backing up data and exporting to Excel-compatible formats.
 */
import { supabase } from './supabaseClient'

// Trigger browser download for a blob
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Trigger browser download for JSON data
export function exportJSON(data, filename) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, filename)
}

// Convert array of objects to CSV string
function arrayToCSV(arr, columns) {
  if (!arr || arr.length === 0) return ''
  
  const headers = columns.map(c => c.header)
  const rows = arr.map(item => {
    return columns.map(col => {
      let val = col.key.split('.').reduce((obj, k) => obj?.[k], item)
      if (val === undefined || val === null) val = ''
      // Handle arrays (e.g., sizes, parts)
      if (Array.isArray(val)) val = val.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('; ')
      // Handle objects
      if (typeof val === 'object' && !Array.isArray(val)) val = JSON.stringify(val)
      // Escape CSV special characters
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    })
  })
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

// Export array of objects to CSV file
export function exportCSV(arr, columns, filename) {
  const csv = arrayToCSV(arr, columns)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

// Flatten job workers data for Excel export
export function flattenJobWorkersForExcel(workers) {
  const rows = []
  workers?.forEach(jw => {
    const base = {
      'Worker ID': jw.id,
      'Worker Name': jw.name,
      'Phone': jw.phone || '',
    }
    
    if (jw.groups?.length > 0) {
      jw.groups.forEach(group => {
        const groupRow = {
          ...base,
          'Group ID': group.id,
          'Group Name': group.group_name,
          'Item Type ID': group.item_type_id || '',
          'Piece Rate': group.piece_rate || 0,
        }
        
        if (group.group_sizes?.length > 0) {
          group.group_sizes.forEach(size => {
            rows.push({
              ...groupRow,
              'Size ID': size.id,
              'Size Name': size.name,
            })
          })
        } else {
          rows.push(groupRow)
        }
      })
    } else {
      rows.push(base)
    }
  })
  return rows
}

// Export job workers to CSV
export function exportJobWorkersCSV(workers, filename = 'job_workers_groups.csv') {
  const flatData = flattenJobWorkersForExcel(workers)
  const columns = [
    { key: 'Worker ID', header: 'Worker ID' },
    { key: 'Worker Name', header: 'Worker Name' },
    { key: 'Phone', header: 'Phone' },
    { key: 'Group ID', header: 'Group ID' },
    { key: 'Group Name', header: 'Group Name' },
    { key: 'Item Type ID', header: 'Item Type ID' },
    { key: 'Piece Rate', header: 'Piece Rate' },
    { key: 'Size ID', header: 'Size ID' },
    { key: 'Size Name', header: 'Size Name' },
  ]
  exportCSV(flatData, columns, filename)
}

// Fetch every row of a table using pagination so tables with >1000 rows
// (Supabase's default page size) are not silently truncated in the backup.
// The query builder is immutable — each .range() returns a new query — so we
// can call it repeatedly on the same base query.
async function fetchAllRows(baseQuery) {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    const { data, error } = await baseQuery.range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    allRows = allRows.concat(data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return allRows
}

// Fetch ALL tables for a complete database backup.
// Every table is included with its full nested relations so nothing is left out.
export async function fetchAllDataForBackup() {
  const [jobWorkers, itemTypes, parties, fabrics, partNames, orders, issueFabric, receiveMaterial, payments, profiles] = await Promise.all([
    // Job workers → groups → (group_sizes, group_parts → group_part_bom)
    fetchAllRows(supabase.from('job_workers').select('*, groups(*, group_sizes(*), group_parts(*, group_part_bom(*)))')),
    fetchAllRows(supabase.from('item_types').select('*')),
    fetchAllRows(supabase.from('parties').select('*')),
    fetchAllRows(supabase.from('fabrics').select('*')),
    fetchAllRows(supabase.from('part_names').select('*')),
    // Orders → expected quantities (includes soft-deleted rows: deleted_at is
    // preserved in the data so a restore can decide what to do with them)
    fetchAllRows(supabase.from('orders').select('*, order_expected_qty(*)')),
    // Issue fabric → blocks → lumps
    fetchAllRows(supabase.from('issue_fabric').select('*, issue_fabric_blocks(*, issue_fabric_lumps(*))')),
    // Receive material → items → (size-wise pieces, part-fabric mappings)
    fetchAllRows(supabase.from('receive_material').select('*, receive_items(*, receive_item_sizes(*), receive_item_part_fabric(*))')),
    fetchAllRows(supabase.from('payments').select('*')),
    fetchAllRows(supabase.from('profiles').select('*')),
  ])

  return {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    data: {
      jobWorkers,
      itemTypes,
      parties,
      fabrics,
      partNames,
      orders,
      issueFabric,
      receiveMaterial,
      payments,
      profiles,
    },
  }
}