import { useState, useMemo, useEffect } from 'react'
import { useApiCall } from '../hooks/useApiCall'
import { fetchReceiveMaterial } from '../features/receiveMaterial/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fetchItemTypes } from '../features/masters/api'
import { fmtNum } from '../lib/format'

const FILTERS_KEY = 'jwt_filters_groupWise'

export default function GroupWiseData() {
  const { data: receives, loading, error } = useApiCall(fetchReceiveMaterial)
  const { data: jobWorkers } = useApiCall(fetchJobWorkers)
  const { data: itemTypes } = useApiCall(fetchItemTypes)
  const [filt, setFilt] = useState(() => {
    try {
      const saved = localStorage.getItem(FILTERS_KEY)
      return saved ? JSON.parse(saved) : { date_from: '', date_to: '', jobWorkerId: '', itemTypeId: '', groupId: '' }
    } catch { return { date_from: '', date_to: '', jobWorkerId: '', itemTypeId: '', groupId: '' } }
  })

  // Persist filters to localStorage
  useEffect(() => {
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify(filt)) } catch {}
  }, [filt])

  function set(key, val) { setFilt({ ...filt, [key]: val }) }

  function getGroup(jwId, groupId) {
    return jobWorkers?.find((j) => j.id === jwId)?.groups?.find((g) => g.id === groupId) || null
  }

  const groupRows = useMemo(() => {
    if (!receives || !jobWorkers || !itemTypes) return []
    const map = {}
    receives.forEach((entry) => {
      if (filt.date_from && entry.date < filt.date_from) return
      if (filt.date_to && entry.date > filt.date_to) return
      ;(entry.receive_items || []).forEach((item) => {
        const group = getGroup(entry.job_worker_id, item.group_id)
        if (!group) return
        const pieces = (item.receive_item_sizes || []).reduce((sum, sw) => sum + (sw.pieces || 0), 0)
        const key = entry.job_worker_id + '|' + (item.item_type_id || '') + '|' + item.group_id
        if (!map[key]) map[key] = { pieces: 0, amount: 0 }
        map[key].pieces += pieces
        map[key].amount += pieces * (group.piece_rate || 0)
      })
    })
    const rows = Object.entries(map).map(([key, val]) => {
      const [jwId, itemTypeId, groupId] = key.split('|')
      const jw = jobWorkers.find((j) => j.id === jwId)
      const it = itemTypes.find((t) => t.id === itemTypeId)
      const group = getGroup(jwId, groupId)
      if (!jw || !it || !group) return null
      return { jobWorkerId: jwId, jobWorkerName: jw.name, itemTypeId, itemTypeName: it.name, groupId, groupName: group.group_name, pieceRate: group.piece_rate, pieces: val.pieces, amount: val.amount }
    }).filter(Boolean)
    rows.sort((a, b) => a.jobWorkerName.localeCompare(b.jobWorkerName) || a.itemTypeName.localeCompare(b.itemTypeName) || a.groupName.localeCompare(b.groupName))
    return rows
  }, [receives, jobWorkers, itemTypes, filt.date_from, filt.date_to])

  const filtered = groupRows.filter((r) => (filt.jobWorkerId && r.jobWorkerId !== filt.jobWorkerId) || (filt.itemTypeId && r.itemTypeId !== filt.itemTypeId) || (filt.groupId && r.groupId !== filt.groupId) ? false : true)

  const groupOptions = []
  jobWorkers?.forEach((jw) => { if (filt.jobWorkerId && filt.jobWorkerId !== jw.id) return; (jw.groups || []).forEach((g) => groupOptions.push({ id: g.id, name: jw.name + ' — ' + g.group_name })) })

  const totalPieces = filtered.reduce((s, r) => s + r.pieces, 0)
  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0)
  const F = 'w-full px-3 py-2 border border-border-strong rounded-md text-sm'

  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-1">Group-wise Data <span className="text-sm font-normal text-text-soft">Pieces received & billing amount, by Job Worker &rarr; Item Type &rarr; Group</span></h2>
        <FilterBar filt={filt} set={set} jobWorkers={jobWorkers} itemTypes={itemTypes} groupOptions={groupOptions} F={F} />
      </div>
      <div className="bg-panel border border-border rounded-lg p-4 mt-4">
        {!filtered.length ? (<div className="empty-state"><div className="msg">No data matches these filters.</div></div>) : (
          <div className="table-scroll"><table className="w-full border-collapse text-[13.5px]">
            <thead><tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border"><th className="p-2.5">Job Worker</th><th className="p-2.5">Item Type</th><th className="p-2.5">Group</th><th className="p-2.5 text-right">Piece Rate</th><th className="p-2.5 text-right">Pieces</th><th className="p-2.5 text-right">Amount</th></tr></thead>
            <tbody>{filtered.map((r, i) => (<tr key={i} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]"><td className="p-2.5">{r.jobWorkerName}</td><td className="p-2.5">{r.itemTypeName}</td><td className="p-2.5">{r.groupName}</td><td className="p-2.5 text-right font-mono">₹{fmtNum(r.pieceRate)}</td><td className="p-2.5 text-right font-mono">{fmtNum(r.pieces, 0)}</td><td className="p-2.5 text-right font-mono">₹{fmtNum(r.amount)}</td></tr>))}</tbody>
            <tfoot><tr className="font-bold"><td colSpan={4} className="p-2.5">Total</td><td className="p-2.5 text-right font-mono">{fmtNum(totalPieces, 0)}</td><td className="p-2.5 text-right font-mono">₹{fmtNum(totalAmount)}</td></tr></tfoot>
          </table></div>
        )}
      </div>
    </div>
  )
}

function FilterBar({ filt, set, jobWorkers, itemTypes, groupOptions, F }) {
  return (
    <div className="flex gap-3 mt-3 flex-wrap items-end">
      <div className="w-40">
        <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Date from</label>
        <input type="date" className={F} value={filt.date_from} onChange={(e) => set('date_from', e.target.value)} />
      </div>
      <div className="w-40">
        <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Date to</label>
        <input type="date" className={F} value={filt.date_to} onChange={(e) => set('date_to', e.target.value)} />
      </div>
      <div className="w-48">
        <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label>
        <select className={F} value={filt.jobWorkerId} onChange={(e) => set('jobWorkerId', e.target.value)}>
          <option value="">All job workers</option>
          {jobWorkers?.map((jw) => <option key={jw.id} value={jw.id}>{jw.name}</option>)}
        </select>
      </div>
      <div className="w-48">
        <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Item Type</label>
        <select className={F} value={filt.itemTypeId} onChange={(e) => set('itemTypeId', e.target.value)}>
          <option value="">All item types</option>
          {itemTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="w-56">
        <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Group</label>
        <select className={F} value={filt.groupId} onChange={(e) => set('groupId', e.target.value)}>
          <option value="">All groups</option>
          {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <button className="btn" onClick={() => setFilt({ date_from: '', date_to: '', jobWorkerId: '', itemTypeId: '', groupId: '' })}>Clear filters</button>
    </div>
  )
}