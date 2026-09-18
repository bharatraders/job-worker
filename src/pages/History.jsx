import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiCall, useMutation } from '../hooks/useApiCall'
import { fetchIssueFabric, deleteIssueFabric } from '../features/issueFabric/api'
import { fetchReceiveMaterial, deleteReceiveMaterial } from '../features/receiveMaterial/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fetchParties, fetchItemTypes, fetchFabrics } from '../features/masters/api'
import { showToast } from '../components/ui/Toast'
import { IssueChallanCard, ReceiveChallanCard } from '../components/ChallanCards'
import { useConfirm } from '../components/ui/ConfirmModal'

const FILTERS_KEY = 'jwt_filters_history'

export default function History() {
  const [tab, setTab] = useState('all')
  const [filt, setFilt] = useState(() => {
    try {
      const saved = localStorage.getItem(FILTERS_KEY)
      return saved ? JSON.parse(saved) : { issue: {}, receive: {}, all: {} }
    } catch { return { issue: {}, receive: {}, all: {} } }
  })
  const { data: issues, refetch: ri } = useApiCall(fetchIssueFabric, [], 'issueFabric')
  const { data: receives, refetch: rr } = useApiCall(fetchReceiveMaterial, [], 'receiveMaterial')
  const { data: jobWorkers } = useApiCall(fetchJobWorkers, [], 'jobWorkers')
  const { data: parties } = useApiCall(fetchParties, [], 'parties')
  const { data: itemTypes } = useApiCall(fetchItemTypes, [], 'itemTypes')
  const { data: fabrics } = useApiCall(fetchFabrics, [], 'fabrics')
  const navigate = useNavigate()
  const { mutate: removeIssue } = useMutation(deleteIssueFabric)
  const { mutate: removeReceive } = useMutation(deleteReceiveMaterial)
  const { confirm } = useConfirm()
  const F = 'w-full px-3 py-2 border border-border-strong rounded-md text-sm'
  const tf = filt[tab] || {}
  function setTf(key, val) { setFilt(prev => ({ ...prev, [tab]: { ...prev[tab], [key]: val } })) }
  function clearTf() { setFilt(prev => ({ ...prev, [tab]: {} })) }

  // Persist filters to localStorage
  useEffect(() => {
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify(filt)) } catch {}
  }, [filt])

  function mc(f, e) { return !(f.jobWorkerId && e.job_worker_id !== f.jobWorkerId) && !(f.date_from && e.date < f.date_from) && !(f.date_to && e.date > f.date_to) }
  const issueRows = (() => { const f = filt.issue || {}; return (issues || []).filter((e) => mc(f, e) && !(f.fabricId && !(e.issue_fabric_blocks || []).some((b) => b.fabric_id === f.fabricId))).sort((a, b) => new Date(b.date) - new Date(a.date)) })()
  const receiveRows = (() => { const f = filt.receive || {}; return (receives || []).filter((e) => mc(f, e) && !(f.itemTypeId && !(e.receive_items || []).some((it) => (it.item_type_id || '') === f.itemTypeId)) && !(f.partyId && !(e.receive_items || []).some((it) => (it.party_id || '') === f.partyId)) && !(f.groupId && !(e.receive_items || []).some((it) => (it.group_id || '') === f.groupId)) && !(f.fabricId && !(e.receive_items || []).some((it) => (it.receive_item_part_fabric || []).some((pf) => pf.fabric_id === f.fabricId)))).sort((a, b) => new Date(b.date) - new Date(a.date)) })()
  const allRows = (() => {
    const f = filt.all || {}
    const filteredIssues = (issues || []).filter((e) => mc(f, e) && !(f.fabricId && !(e.issue_fabric_blocks || []).some((b) => b.fabric_id === f.fabricId))).map((e) => ({ ...e, _type: 'issue' }))
    const filteredReceives = (receives || []).filter((e) => mc(f, e) && !(f.itemTypeId && !(e.receive_items || []).some((it) => (it.item_type_id || '') === f.itemTypeId)) && !(f.partyId && !(e.receive_items || []).some((it) => (it.party_id || '') === f.partyId)) && !(f.groupId && !(e.receive_items || []).some((it) => (it.group_id || '') === f.groupId)) && !(f.fabricId && !(e.receive_items || []).some((it) => (it.receive_item_part_fabric || []).some((pf) => pf.fabric_id === f.fabricId)))).map((e) => ({ ...e, _type: 'receive' }))
    return [...filteredIssues, ...filteredReceives].sort((a, b) => new Date(b.date) - new Date(a.date))
  })()
  const groupOptions = (() => { const r = []; jobWorkers?.forEach((jw) => { const af = filt[tab] || {}; if (af.jobWorkerId && af.jobWorkerId !== jw.id) return; (jw.groups || []).forEach((g) => r.push({ id: g.id, name: jw.name + ' - ' + g.group_name })) }); return r })()
  async function delIssue(e) {
    const ok = await confirm({
      title: 'Delete Issue Entry',
      message: `Delete challan #${e.challan_no}? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
    })
    if (!ok) return
    try { await removeIssue(e.id); showToast('Deleted'); ri() } catch (x) { showToast('Failed: ' + x.message) }
  }
  async function delReceive(e) {
    const ok = await confirm({
      title: 'Delete Receive Entry',
      message: `Delete challan #${e.challan_no}? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
    })
    if (!ok) return
    try { await removeReceive(e.id); showToast('Deleted'); rr() } catch (x) { showToast('Failed: ' + x.message) }
  }
  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-soft uppercase mr-2">View:</span>
          {[{ id: 'all', label: 'All' }, { id: 'issue', label: 'Fabric Issued' }, { id: 'receive', label: 'Material Received' }].map((t) => (
            <button key={t.id} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? 'bg-amber text-white shadow-sm' : 'bg-white border border-border text-text-soft hover:border-amber hover:text-amber'}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>
      <HistoryFilterBar tab={tab} tf={tf} setTf={setTf} clearTf={clearTf} F={F} jobWorkers={jobWorkers} fabrics={fabrics} itemTypes={itemTypes} parties={parties} groupOptions={groupOptions} />
      {tab === 'all' && (<div className="bg-panel border border-border rounded-lg p-4"><h2 className="text-base font-bold mb-3">All Challans ({allRows.length})</h2>{!allRows.length ? (<div className="empty-state"><div className="msg">No entries match these filters.</div></div>) : (<div className="space-y-3">{allRows.map((e) => e._type === 'issue' ? <IssueChallanCard key={'i-' + e.id} e={e} jobWorkers={jobWorkers} fabrics={fabrics} onEdit={(ent) => navigate('/issue-fabric', { state: { editEntry: ent } })} onDelete={delIssue} /> : <ReceiveChallanCard key={'r-' + e.id} e={e} jobWorkers={jobWorkers} itemTypes={itemTypes} parties={parties} fabrics={fabrics} onEdit={(ent) => navigate('/receive-material/new', { state: { editEntry: ent } })} onDelete={delReceive} />)}</div>)}</div>)}
      {tab === 'issue' && (<div className="bg-panel border border-border rounded-lg p-4"><h2 className="text-base font-bold mb-3">Fabric Issued ({issueRows.length})</h2>{!issueRows.length ? (<div className="empty-state"><div className="msg">No fabric issue entries match these filters.</div></div>) : (<div className="space-y-3">{issueRows.map((e) => <IssueChallanCard key={e.id} e={e} jobWorkers={jobWorkers} fabrics={fabrics} onEdit={(ent) => navigate('/issue-fabric', { state: { editEntry: ent } })} onDelete={delIssue} />)}</div>)}</div>)}
      {tab === 'receive' && (<div className="bg-panel border border-border rounded-lg p-4"><h2 className="text-base font-bold mb-3">Material Received ({receiveRows.length})</h2>{!receiveRows.length ? (<div className="empty-state"><div className="msg">No receive entries match these filters.</div></div>) : (<div className="space-y-3">{receiveRows.map((e) => <ReceiveChallanCard key={e.id} e={e} jobWorkers={jobWorkers} itemTypes={itemTypes} parties={parties} fabrics={fabrics} onEdit={(ent) => navigate('/receive-material/new', { state: { editEntry: ent } })} onDelete={delReceive} />)}</div>)}</div>)}
    </div>
  )
}

function HistoryFilterBar({ tab, tf, setTf, clearTf, F, jobWorkers, fabrics, itemTypes, parties, groupOptions }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4 mb-4">
      <div className="flex gap-3 flex-wrap items-end">
        <div className="w-40"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Date from</label><input type="date" className={F} value={tf.date_from || ''} onChange={(e) => setTf('date_from', e.target.value)} /></div>
        <div className="w-40"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Date to</label><input type="date" className={F} value={tf.date_to || ''} onChange={(e) => setTf('date_to', e.target.value)} /></div>
        {tab === 'issue' && (<>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label><select className={F} value={tf.jobWorkerId || ''} onChange={(e) => setTf('jobWorkerId', e.target.value)}><option value="">All job workers</option>{jobWorkers?.map((jw) => <option key={jw.id} value={jw.id}>{jw.name}</option>)}</select></div>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Fabric</label><select className={F} value={tf.fabricId || ''} onChange={(e) => setTf('fabricId', e.target.value)}><option value="">All fabrics</option>{fabrics?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
        </>)}
        {tab === 'receive' && (<>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Item Type</label><select className={F} value={tf.itemTypeId || ''} onChange={(e) => setTf('itemTypeId', e.target.value)}><option value="">All item types</option>{itemTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label><select className={F} value={tf.jobWorkerId || ''} onChange={(e) => setTf('jobWorkerId', e.target.value)}><option value="">All job workers</option>{jobWorkers?.map((jw) => <option key={jw.id} value={jw.id}>{jw.name}</option>)}</select></div>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Party</label><select className={F} value={tf.partyId || ''} onChange={(e) => setTf('partyId', e.target.value)}><option value="">All parties</option>{parties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="w-56"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Group</label><select className={F} value={tf.groupId || ''} onChange={(e) => setTf('groupId', e.target.value)}><option value="">All groups</option>{groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Fabric</label><select className={F} value={tf.fabricId || ''} onChange={(e) => setTf('fabricId', e.target.value)}><option value="">All fabrics</option>{fabrics?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
        </>)}
        {tab === 'all' && (<>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Party</label><select className={F} value={tf.partyId || ''} onChange={(e) => setTf('partyId', e.target.value)}><option value="">All parties</option>{parties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Item Type</label><select className={F} value={tf.itemTypeId || ''} onChange={(e) => setTf('itemTypeId', e.target.value)}><option value="">All item types</option>{itemTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label><select className={F} value={tf.jobWorkerId || ''} onChange={(e) => setTf('jobWorkerId', e.target.value)}><option value="">All job workers</option>{jobWorkers?.map((jw) => <option key={jw.id} value={jw.id}>{jw.name}</option>)}</select></div>
          <div className="w-56"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Group</label><select className={F} value={tf.groupId || ''} onChange={(e) => setTf('groupId', e.target.value)}><option value="">All groups</option>{groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
          <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Fabric</label><select className={F} value={tf.fabricId || ''} onChange={(e) => setTf('fabricId', e.target.value)}><option value="">All fabrics</option>{fabrics?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
        </>)}
        <button className="btn" onClick={clearTf}>Clear filters</button>
      </div>
    </div>
  )
}

