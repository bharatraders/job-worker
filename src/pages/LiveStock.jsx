/**
 * Live Stock page — queries view_live_stock (computed in Postgres).
 * Shows fabric balance per job-worker: issued minus BOM-consumed.
 * Filterable by job worker and fabric.
 */
import { useState, useMemo, useEffect } from 'react'
import { useApiCall } from '../hooks/useApiCall'
import { fetchLiveStock } from '../features/views/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fetchFabrics, fetchItemTypes, fetchParties } from '../features/masters/api'
import { fmtNum } from '../lib/format'
import { FiFilter } from 'react-icons/fi'

const FILTERS_KEY = 'jwt_filters_liveStock'

export default function LiveStock() {
  const { data: stockRows, loading, error } = useApiCall(fetchLiveStock)
  const { data: jobWorkers } = useApiCall(fetchJobWorkers)
  const { data: fabrics } = useApiCall(fetchFabrics)
  const [filterJw, setFilterJw] = useState('')
  const [filterFab, setFilterFab] = useState('')

  // Restore filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTERS_KEY)
      if (saved) {
        const { filterJw: sJw, filterFab: sFab } = JSON.parse(saved)
        if (sJw) setFilterJw(sJw)
        if (sFab) setFilterFab(sFab)
      }
    } catch {}
  }, [])

  // Persist filters to localStorage
  useEffect(() => {
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify({ filterJw, filterFab })) } catch {}
  }, [filterJw, filterFab])

  const filtered = useMemo(() => {
    if (!stockRows) return []
    const rows = stockRows.filter((r) => {
      if (filterJw && r.job_worker_id !== filterJw) return false
      if (filterFab && r.fabric_id !== filterFab) return false
      return true
    })
    // Primary sort: fabric name A→Z; tiebreaker: job worker name (deliberate change from the HTML's job-worker-first sort)
    rows.sort((a, b) => fabName(a.fabric_id).localeCompare(fabName(b.fabric_id)) || jwName(a.job_worker_id).localeCompare(jwName(b.job_worker_id)))
    return rows
  }, [stockRows, filterJw, filterFab, jobWorkers, fabrics])

  function jwName(id) {
    const jw = jobWorkers?.find((j) => j.id === id)
    return jw?.name || '—'
  }
  function fabName(id) {
    const f = fabrics?.find((x) => x.id === id)
    return f?.name || '—'
  }

  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-1">Live Stock</h2>
        <p className="text-sm text-text-soft mb-4">Unused fabric per job worker (issued − BOM-consumed)</p>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="w-48">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label>
            <select className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={filterJw} onChange={(e) => setFilterJw(e.target.value)}>
              <option value="">All job workers</option>
              {jobWorkers?.map((jw) => <option key={jw.id} value={jw.id}>{jw.name}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Fabric</label>
            <select className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={filterFab} onChange={(e) => setFilterFab(e.target.value)}>
              <option value="">All fabrics</option>
              {fabrics?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <button className="btn btn-sm self-end" onClick={() => { setFilterJw(''); setFilterFab('') }}>Clear filters</button>
        </div>

        {/* Table */}
        {!filtered.length ? (
          <div className="empty-state"><div className="msg">No stock data matches these filters.</div></div>
        ) : (
          <div className="table-scroll">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border">
                  <th className="p-2.5">Job Worker</th>
                  <th className="p-2.5">Fabric / Design</th>
                  <th className="p-2.5 text-right">Issued (m)</th>
                  <th className="p-2.5 text-right">Consumed (m)</th>
                  <th className="p-2.5 text-right">Balance (m)</th>
                  <th className="p-2.5">Note</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const low = r.balance_metres <= 0
                  return (
                    <tr key={i} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
                      <td className="p-2.5">{jwName(r.job_worker_id)}</td>
                      <td className="p-2.5">{fabName(r.fabric_id)}</td>
                      <td className="p-2.5 text-right font-mono">{fmtNum(r.issued_metres)}</td>
                      <td className="p-2.5 text-right font-mono">{fmtNum(r.consumed_metres)}</td>
                      <td className={`p-2.5 text-right font-mono font-bold ${low ? 'text-red' : 'text-green'}`}>{fmtNum(r.balance_metres)}</td>
                      <td className="p-2.5">
                        {low ? <span className="badge badge-low">Depleted</span> : <span className="badge badge-ok">In stock</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
