/**
 * Fabric Ledger page — date-wise issued vs consumed per job-worker x fabric,
 * with a running balance. Reference: function renderFabricLedger(c) in jobwork_v3.html.
 *
 * Replicates computeFabricLedger(jobWorkerId, fabricId): merges issue rows and
 * receive-consumption rows by date, then walks a cumulative balance.
 */
import { useState, useMemo } from 'react'
import { useApiCall } from '../hooks/useApiCall'
import { fetchIssueFabric } from '../features/issueFabric/api'
import { fetchReceiveMaterial } from '../features/receiveMaterial/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fetchFabrics } from '../features/masters/api'
import { fmtNum, fmtDate } from '../lib/format'

export default function FabricLedger() {
  const { data: issues, loading: l1, error: e1 } = useApiCall(fetchIssueFabric)
  const { data: receives, loading: l2, error: e2 } = useApiCall(fetchReceiveMaterial)
  const { data: jobWorkers } = useApiCall(fetchJobWorkers)
  const { data: fabrics } = useApiCall(fetchFabrics)

  const [jwId, setJwId] = useState('')
  const [fabId, setFabId] = useState('')

  function jwName(id) { return jobWorkers?.find((j) => j.id === id)?.name || '—' }
  function fabName(id) { return fabrics?.find((f) => f.id === id)?.name || '—' }

  const ledgerRows = useMemo(() => {
    if (!jwId || !fabId || !issues || !receives) return []
    const rows = []
    issues.forEach((entry) => {
      if (entry.job_worker_id !== jwId) return
      const metres = (entry.issue_fabric_blocks || [])
        .filter((b) => b.fabric_id === fabId)
        .reduce((sum, b) => sum + (b.issue_fabric_lumps || []).reduce((s, l) => s + (parseFloat(l.metres) || 0), 0), 0)
      if (metres > 0) rows.push({ date: entry.date, type: 'Issued', challanNo: entry.challan_no, issued: metres, consumed: 0 })
    })
    receives.forEach((entry) => {
      if (entry.job_worker_id !== jwId) return
      let metres = 0
      ;(entry.receive_items || []).forEach((item) => {
        const group = jobWorkers?.find((j) => j.id === entry.job_worker_id)?.groups?.find((g) => g.id === item.group_id)
        const parts = group?.group_parts || []
        parts.forEach((part) => {
          ;(item.receive_item_sizes || []).forEach((sw) => {
            const bom = part.group_part_bom?.find((b) => b.size_id === sw.size_id)
            if (!bom || bom.cm_per_piece === undefined || bom.cm_per_piece === '') return
            const fabricForPart = (item.receive_item_part_fabric || []).find((pf) => pf.part_id === part.id)?.fabric_id
            if (fabricForPart !== fabId) return
            metres += (sw.pieces || 0) * (parseFloat(bom.cm_per_piece) || 0) / 100
          })
        })
      })
      if (metres > 0) rows.push({ date: entry.date, type: 'Received', challanNo: entry.challan_no, issued: 0, consumed: metres })
    })
    rows.sort((a, b) => new Date(a.date) - new Date(b.date))
    let balance = 0
    rows.forEach((r) => { balance += r.issued - r.consumed; r.balance = balance })
    return rows
  }, [jwId, fabId, issues, receives, jobWorkers])

  const totalIssued = ledgerRows.reduce((s, r) => s + r.issued, 0)
  const totalConsumed = ledgerRows.reduce((s, r) => s + r.consumed, 0)
  const currentBalance = ledgerRows.length ? ledgerRows[ledgerRows.length - 1].balance : 0

  const F = 'w-full px-3 py-2 border border-border-strong rounded-md text-sm'

  if (l1 || l2) return <div className="text-text-soft p-8">Loading...</div>
  if (e1 || e2) return <div className="text-red p-8">Error: {e1 || e2}</div>

  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-1">
          Fabric Ledger <span className="text-sm font-normal text-text-soft">Date-wise issued vs consumed, with running balance</span>
        </h2>
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="w-56">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label>
            <select className={F} value={jwId} onChange={(e) => setJwId(e.target.value)}>
              <option value="">Select job worker...</option>
              {jobWorkers?.map((jw) => <option key={jw.id} value={jw.id}>{jw.name}</option>)}
            </select>
          </div>
          <div className="w-56">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Fabric</label>
            <select className={F} value={fabId} onChange={(e) => setFabId(e.target.value)}>
              <option value="">Select fabric...</option>
              {fabrics?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mt-4">
        {!jwId || !fabId ? (
          <div className="empty-state"><div className="msg">Select a job worker and fabric to view ledger</div></div>
        ) : ledgerRows.length === 0 ? (
          <div className="empty-state"><div className="msg">No transactions found for this combination</div></div>
        ) : (
          <>
            <h2 className="text-base font-bold mb-3">
              Date-wise Ledger <span className="text-sm font-normal text-text-soft">{jwName(jwId)} x {fabName(fabId)}</span>
            </h2>
            <LedgerTable rows={ledgerRows} />
            <div className="flex justify-between mt-4 flex-wrap gap-2">
              <div className="text-sm text-text-soft">
                Total issued: <b>{fmtNum(totalIssued)} m</b> &middot; Total consumed: <b>{fmtNum(totalConsumed)} m</b>
              </div>
              <div className="text-sm font-bold">
                Current balance: <span className={'badge ' + (currentBalance > 0 ? 'badge-ok' : 'badge-low')}>{fmtNum(currentBalance)} m</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LedgerTable({ rows }) {
  return (
    <div className="table-scroll">
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border">
            <th className="p-2.5">Date</th>
            <th className="p-2.5">Type</th>
            <th className="p-2.5">Challan</th>
            <th className="p-2.5 text-right">Issued (m)</th>
            <th className="p-2.5 text-right">Consumed (m)</th>
            <th className="p-2.5 text-right">Balance (m)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
              <td className="p-2.5">{fmtDate(r.date)}</td>
              <td className="p-2.5"><span className={'badge ' + (r.type === 'Issued' ? 'badge-neutral' : 'badge-ok')}>{r.type}</span></td>
              <td className="p-2.5">#{r.challanNo}</td>
              <td className="p-2.5 text-right font-mono">{r.issued > 0 ? fmtNum(r.issued) : '—'}</td>
              <td className="p-2.5 text-right font-mono">{r.consumed > 0 ? fmtNum(r.consumed) : '—'}</td>
              <td className="p-2.5 text-right font-mono">{fmtNum(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}