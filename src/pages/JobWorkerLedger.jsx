import { useMemo, useState } from 'react'
import { useApiCall } from '../hooks/useApiCall'
import { fetchIssueFabric } from '../features/issueFabric/api'
import { fetchReceiveMaterial } from '../features/receiveMaterial/api'
import { fetchPayments } from '../features/payments/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fetchFabrics } from '../features/masters/api'
import { fmtNum, fmtDate } from '../lib/format'
import SearchSelect from '../components/ui/SearchSelect'

export default function JobWorkerLedger() {
  const { data: issues, loading: loadingIssues, error: issueError } = useApiCall(fetchIssueFabric)
  const { data: receives, loading: loadingReceives, error: receiveError } = useApiCall(fetchReceiveMaterial)
  const { data: payments, loading: loadingPayments, error: paymentError } = useApiCall(fetchPayments)
  const { data: jobWorkers, loading: loadingWorkers, error: workersError } = useApiCall(fetchJobWorkers)
  const { data: fabrics, loading: loadingFabrics, error: fabricsError } = useApiCall(fetchFabrics)

  const [jwId, setJwId] = useState('')

  const rows = useMemo(() => {
    if (!jwId || !issues || !receives || !payments) return []

    const entries = []

    issues.forEach((entry) => {
      if (entry.job_worker_id !== jwId) return

      ;(entry.issue_fabric_blocks || []).forEach((block) => {
        const fabricName = fabrics?.find((f) => f.id === block.fabric_id)?.name || 'Unknown fabric'
        const metres = (block.issue_fabric_lumps || []).reduce((sum, lump) => sum + (Number(lump.metres) || 0), 0)

        if (metres <= 0) return
        entries.push({
          id: `${entry.id}-${block.id || 'block'}`,
          date: entry.date,
          type: 'Fabric Issued',
          reference: entry.challan_no || '—',
          details: fabricName,
          value: metres,
          unit: 'm',
        })
      })
    })

    receives.forEach((entry) => {
      if (entry.job_worker_id !== jwId) return

      const pieces = (entry.receive_items || []).reduce((sum, item) => {
        return sum + (item.receive_item_sizes || []).reduce((innerSum, sizeRow) => innerSum + (Number(sizeRow.pieces) || 0), 0)
      }, 0)

      if (pieces <= 0) return
      entries.push({
        id: `${entry.id}-receive`,
        date: entry.date,
        type: 'Material Received',
        reference: entry.challan_no || '—',
        details: `${(entry.receive_items || []).length} item${(entry.receive_items || []).length === 1 ? '' : 's'}`,
        value: pieces,
        unit: 'pcs',
      })
    })

    payments.forEach((entry) => {
      if (entry.job_worker_id !== jwId) return

      entries.push({
        id: entry.id,
        date: entry.date,
        type: 'Payment',
        reference: 'Payment',
        details: entry.notes || 'Cash payment',
        value: Number(entry.amount) || 0,
        unit: '₹',
      })
    })

    return entries.sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [jwId, issues, receives, payments, fabrics])

  const totalFabricIssued = rows
    .filter((row) => row.type === 'Fabric Issued')
    .reduce((sum, row) => sum + Number(row.value || 0), 0)

  const totalReceived = rows
    .filter((row) => row.type === 'Material Received')
    .reduce((sum, row) => sum + Number(row.value || 0), 0)

  const totalPayments = rows
    .filter((row) => row.type === 'Payment')
    .reduce((sum, row) => sum + Number(row.value || 0), 0)

  const loading = loadingIssues || loadingReceives || loadingPayments || loadingWorkers || loadingFabrics
  const error = issueError || receiveError || paymentError || workersError || fabricsError

  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error.message || error}</div>

  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-1">
          Job Worker Ledger <span className="text-sm font-normal text-text-soft">All fabric issues, material receipts, and payments</span>
        </h2>
        <div className="mt-3 w-full max-w-[260px]">
          <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label>
          <SearchSelect
            className="w-full px-3 py-2 border border-border-strong rounded-md text-sm"
            list={jobWorkers?.map((jw) => ({ id: jw.id, name: jw.name })) || []}
            value={jwId}
            placeholder="Select job worker..."
            onSelect={(id) => setJwId(id || '')}
          />
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mt-4">
        {!jwId ? (
          <div className="empty-state"><div className="msg">Select a job worker to view the ledger</div></div>
        ) : rows.length === 0 ? (
          <div className="empty-state"><div className="msg">No transactions found for this job worker.</div></div>
        ) : (
          <>
            <h3 className="text-base font-bold mb-3">
              Transactions for <span className="text-text-soft">{jobWorkers?.find((jw) => jw.id === jwId)?.name || 'Selected worker'}</span>
            </h3>

            <div className="grid gap-3 sm:grid-cols-3 mb-4">
              <div className="bg-[#f7f8fa] border border-border rounded-lg p-3">
                <div className="text-[11px] uppercase text-text-soft font-bold">Fabric issued</div>
                <div className="text-lg font-bold mt-1">{fmtNum(totalFabricIssued)} m</div>
              </div>
              <div className="bg-[#f7f8fa] border border-border rounded-lg p-3">
                <div className="text-[11px] uppercase text-text-soft font-bold">Material received</div>
                <div className="text-lg font-bold mt-1">{fmtNum(totalReceived)} pcs</div>
              </div>
              <div className="bg-[#f7f8fa] border border-border rounded-lg p-3">
                <div className="text-[11px] uppercase text-text-soft font-bold">Payments</div>
                <div className="text-lg font-bold mt-1">₹{fmtNum(totalPayments)}</div>
              </div>
            </div>

            <div className="table-scroll">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Reference</th>
                    <th className="p-2.5">Details</th>
                    <th className="p-2.5 text-right">Qty / Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
                      <td className="p-2.5">{fmtDate(row.date)}</td>
                      <td className="p-2.5">
                        <span className={'badge ' + (row.type === 'Fabric Issued' ? 'badge-neutral' : row.type === 'Payment' ? 'badge-ok' : 'badge-pending')}>{row.type}</span>
                      </td>
                      <td className="p-2.5">#{row.reference}</td>
                      <td className="p-2.5 text-text-soft">{row.details}</td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {row.type === 'Payment' ? `₹${fmtNum(row.value)}` : `${fmtNum(row.value)} ${row.unit}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
