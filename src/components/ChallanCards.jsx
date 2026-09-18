import { fmtDate, fmtNum } from '../lib/format'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

/**
 * Shared challan-detail card components, built from the History page's
 * drawHistoryBody render functions in jobwork_v3.html. Used by the History page
 * (all 3 tabs) AND the Issue Fabric / Receive Material entry listings so the
 * same detail rendering is never duplicated.
 *
 * Issue card reference: drawHistoryBody issue block (getFabric per block).
 * Receive card reference: drawHistoryBody receive block.
 *
 * fetchFabrics is always passed in so the fabric-name lookup actually resolves
 * (the root cause of item 5b's "-" bug was that fabrics were never fetched).
 */

export function IssueChallanCard({ e, jobWorkers, fabrics, onEdit, onDelete }) {
  const jw = jobWorkers?.find((j) => j.id === e.job_worker_id)
  const totalM = (e.issue_fabric_blocks || []).reduce((s, b) => s + (b.issue_fabric_lumps || []).reduce((s2, l) => s2 + (parseFloat(l.metres) || 0), 0), 0)
  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <b>Challan #{e.challan_no}</b> &middot; {fmtDate(e.date)} &middot; {jw ? jw.name : '—'}
          {e.order_id ? <span className="badge badge-neutral ml-2">Order linked</span> : <span className="badge badge-low ml-2">No order link</span>}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1.5">
            {onEdit && (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent-soft text-accent hover:bg-accent hover:text-white transition-colors" onClick={() => onEdit(e)} title="Edit entry">
                <FiEdit2 size={13} /> Edit
              </button>
            )}
            {onDelete && (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-soft text-red hover:bg-red hover:text-white transition-colors" onClick={() => onDelete(e)} title="Delete entry">
                <FiTrash2 size={13} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
      <div className="table-scroll">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-text-soft text-xs uppercase"><th className="text-left p-1.5">Fabric</th><th className="text-left p-1.5">Lumps</th><th className="text-right p-1.5">Total Metres</th></tr>
          </thead>
          <tbody>
            {(e.issue_fabric_blocks || []).map((b) => {
              const f = fabrics?.find((x) => x.id === b.fabric_id)
              const bm = (b.issue_fabric_lumps || []).reduce((s, l) => s + (parseFloat(l.metres) || 0), 0)
              return (
                <tr key={b.id} className="border-t border-[#ecedf1]">
                  <td className="p-1.5">{f ? f.name : '—'}</td>
                  <td className="p-1.5 text-xs">{(b.issue_fabric_lumps || []).map((l) => fmtNum(l.metres)).join(', ')}</td>
                  <td className="p-1.5 text-right font-mono">{fmtNum(bm)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="text-right text-xs text-text-soft mt-2">Total issued: <b>{fmtNum(totalM)} m</b></div>
    </div>
  )
}

export function ReceiveChallanCard({ e, jobWorkers, itemTypes, parties, fabrics, onEdit, onDelete }) {
  const jw = jobWorkers?.find((j) => j.id === e.job_worker_id)
  const totalP = (e.receive_items || []).reduce((s, it) => s + (it.receive_item_sizes || []).reduce((s2, sw) => s2 + (sw.pieces || 0), 0), 0)
  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <b>Challan #{e.challan_no}</b> &middot; {fmtDate(e.date)} &middot; {jw ? jw.name : '—'}
          {e.order_id ? <span className="badge badge-neutral ml-2">Order linked</span> : <span className="badge badge-low ml-2">No order link</span>}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1.5">
            {onEdit && (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent-soft text-accent hover:bg-accent hover:text-white transition-colors" onClick={() => onEdit(e)} title="Edit entry">
                <FiEdit2 size={13} /> Edit
              </button>
            )}
            {onDelete && (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-soft text-red hover:bg-red hover:text-white transition-colors" onClick={() => onDelete(e)} title="Delete entry">
                <FiTrash2 size={13} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {(e.receive_items || []).map((it) => {
          const itName = itemTypes?.find((t) => t.id === it.item_type_id)?.name || '—'
          const party = parties?.find((p) => p.id === it.party_id)
          const jw2 = jobWorkers?.find((j) => j.id === e.job_worker_id)
          const group = jw2?.groups?.find((g) => g.id === it.group_id)
          const parts = group?.group_parts || []
          const rowP = (it.receive_item_sizes || []).reduce((s, sw) => s + (sw.pieces || 0), 0)
          return (
            <div key={it.id} className="border border-[#ecedf1] rounded p-2">
              <div className="flex justify-between text-sm mb-1">
                <div><b>{itName}</b> &middot; {party ? party.name : '—'} &middot; {group ? group.group_name : '—'}</div>
                <span className="font-bold">{fmtNum(rowP, 0)} pcs</span>
              </div>
              {parts.length > 0 && (
                <div className="text-xs text-text-soft mb-1">
                  {parts.map((p) => {
                    const fab = (it.receive_item_part_fabric || []).find((pf) => pf.part_id === p.id)
                    const fabName = fab ? (fabrics?.find((f) => f.id === fab.fabric_id)?.name || '—') : '—'
                    return <span key={p.id} className="mr-2">{p.part_name}: {fabName}</span>
                  })}
                </div>
              )}
              {(it.receive_item_sizes || []).length > 0 && (
                <div className="text-xs">
                  {(it.receive_item_sizes || []).map((sw) => {
                    const sz = group?.group_sizes?.find((s) => s.id === sw.size_id)
                    return <span key={sw.size_id} className="mr-2">{sz ? sz.name : sw.size_id}: {sw.pieces}</span>
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="text-right text-xs text-text-soft mt-2">Total: <b>{fmtNum(totalP, 0)} pcs</b></div>
    </div>
  )
}