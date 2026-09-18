import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useApiCall, useMutation } from '../hooks/useApiCall'
import { fetchOrders, upsertOrder, softDeleteOrder } from '../features/orders/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fetchItemTypes, fetchParties, fetchFabrics } from '../features/masters/api'
import { showToast } from '../components/ui/Toast'
import { fmtDate, todayStr } from '../lib/format'
import { FiPlus, FiTrash2, FiEdit2, FiCheckCircle, FiClock, FiList } from 'react-icons/fi'
import { useConfirm } from '../components/ui/ConfirmModal'

const STATUSES = ['Pending', 'Completed']
const F = 'w-full px-3 py-2 border border-border-strong rounded-md text-sm'
const L = 'block text-[11px] font-bold text-text-soft mb-1 uppercase'
const FILTERS_KEY = 'jwt_filters_orders'

/**
 * Unified Orders page. Combines the create/edit form (from the old Create Order
 * screen) with the order list (Pending / Completed toggle) in one view.
 * Top-right "New Order" button opens the form; the toggle switches the list
 * between Pending and Completed orders.
 */
export default function Orders() {
  const { data: orders, loading, error, refetch } = useApiCall(fetchOrders, [], 'orders')
  const { data: jobWorkers } = useApiCall(fetchJobWorkers, [], 'jobWorkers')
  const { data: itemTypes } = useApiCall(fetchItemTypes, [], 'itemTypes')
  const { data: parties } = useApiCall(fetchParties, [], 'parties')
  const { data: fabrics } = useApiCall(fetchFabrics, [], 'fabrics')
  const { mutate: saveOrder, loading: saving } = useMutation(upsertOrder)
  const { mutate: deleteOrderMut } = useMutation(softDeleteOrder)
  const [form, setForm] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [showDeleted, setShowDeleted] = useState(false)
  const [filt, setFilt] = useState(() => {
    try {
      const saved = localStorage.getItem(FILTERS_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })
  const location = useLocation()
  const { confirm } = useConfirm()

  // Persist filters to localStorage
  useEffect(() => {
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify(filt)) } catch {}
  }, [filt])

  useEffect(() => {
    const editOrder = location.state?.editOrder
    if (editOrder) startEdit(editOrder)
  }, [location.state])

  function startNew() { setForm({ id: null, dateCreated: todayStr(), jobWorkerId: '', partyId: '', itemTypeId: '', groupId: '', fabricId: '', status: 'Pending', expectedQty: {} }) }
  function startEdit(o) { setForm({ id: o.id, dateCreated: o.date_created, jobWorkerId: o.job_worker_id, partyId: o.party_id, itemTypeId: o.item_type_id, groupId: o.group_id, fabricId: o.fabric_id, status: o.status, expectedQty: Object.fromEntries((o.order_expected_qty || []).map((e) => [e.size_id, e.qty])) }) }
  const avGroups = useMemo(() => { if (!form?.jobWorkerId || !jobWorkers) return []; const jw = jobWorkers.find((j) => j.id === form.jobWorkerId); return jw?.groups?.filter((g) => !form.itemTypeId || g.item_type_id === form.itemTypeId) || [] }, [form?.jobWorkerId, form?.itemTypeId, jobWorkers])
  const avSizes = useMemo(() => { if (!form?.groupId) return []; return avGroups.find((g) => g.id === form.groupId)?.group_sizes || [] }, [form?.groupId, avGroups])
  const jwN = (id) => jobWorkers?.find((j) => j.id === id)?.name || '—'
  const pN = (id) => parties?.find((p) => p.id === id)?.name || '—'
  const iN = (id) => itemTypes?.find((t) => t.id === id)?.name || '—'
  const gN = (id) => jobWorkers?.flatMap((j) => j.groups || []).find((g) => g.id === id)?.group_name || '—'
  function getGroup(jwId, groupId) { return jobWorkers?.find((j) => j.id === jwId)?.groups?.find((g) => g.id === groupId) || null }

  const allOrders = useMemo(() => (orders || []).filter((o) => (showDeleted || !o.deleted_at) && (statusFilter === 'All' || o.status === statusFilter)), [orders, statusFilter, showDeleted])
  const filtered = useMemo(() => allOrders.filter((o) => matchesFilters(filt, o)), [allOrders, filt])
  const groupOptions = []
  jobWorkers?.forEach((jw) => { if (filt.jobWorkerId && filt.jobWorkerId !== jw.id) return; (jw.groups || []).forEach((g) => groupOptions.push({ id: g.id, name: jw.name + ' — ' + g.group_name })) })

  async function handleSave(e) {
    e.preventDefault()
    if (!form.jobWorkerId || !form.partyId || !form.itemTypeId || !form.groupId) return showToast('Fill required fields')
    try { await saveOrder({ id: form.id, dateCreated: form.dateCreated, jobWorkerId: form.jobWorkerId, partyId: form.partyId, itemTypeId: form.itemTypeId, groupId: form.groupId, fabricId: form.fabricId, status: form.status, fabricNote: '', notes: '', expectedQty: form.expectedQty }); showToast(form.id ? 'Updated' : 'Created'); setForm(null); refetch() } catch (err) { showToast('Failed: ' + err.message) }
  }
  async function handleDelete(id) { const ok = await confirm({ title: 'Delete Order', message: 'This order will be permanently deleted. This action cannot be undone.', type: 'danger', confirmText: 'Delete', }); if (!ok) return; try { await deleteOrderMut(id); showToast('Deleted'); refetch() } catch (err) { showToast('Failed: ' + err.message) } }
  async function toggleStatus(o) {
    try { await saveOrder({ id: o.id, dateCreated: o.date_created, jobWorkerId: o.job_worker_id, partyId: o.party_id, itemTypeId: o.item_type_id, groupId: o.group_id, fabricId: o.fabric_id, status: o.status === 'Pending' ? 'Completed' : 'Pending', fabricNote: '', notes: '', expectedQty: {} }); showToast('Status updated'); refetch() } catch (err) { showToast('Failed: ' + err.message) }
  }
  function set(key, val) { setFilt({ ...filt, [key]: val }) }

  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  return (
    <div>
      {/* Header: title + New Order button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold m-0">Orders</h2>
        {!form && (
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors text-sm font-semibold shadow-sm" onClick={startNew}>
            <FiPlus size={16} /> New Order
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {form && (<div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <h3 className="text-base font-bold mb-3">{form.id ? 'Edit Order' : 'New Order'}</h3>
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div><label className={L}>Date</label><input type="date" className={F} value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} /></div>
            <div><label className={L}>Job Worker</label><select className={F} value={form.jobWorkerId} onChange={(e) => setForm({ ...form, jobWorkerId: e.target.value, groupId: '', expectedQty: {} })}><option value="">Select...</option>{jobWorkers?.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
            <div><label className={L}>Party</label><select className={F} value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}><option value="">Select...</option>{parties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className={L}>Item Type</label><select className={F} value={form.itemTypeId} onChange={(e) => setForm({ ...form, itemTypeId: e.target.value, groupId: '', expectedQty: {} })}><option value="">Select...</option>{itemTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label className={L}>Group</label><select className={F} value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value, expectedQty: {} })}><option value="">Select...</option>{avGroups.map((g) => <option key={g.id} value={g.id}>{g.group_name} (₹{g.piece_rate})</option>)}</select></div>
            <div><label className={L}>Fabric</label><select className={F} value={form.fabricId} onChange={(e) => setForm({ ...form, fabricId: e.target.value })}><option value="">Select...</option>{fabrics?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
            <div><label className={L}>Status</label><select className={F} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
          </div>
          {form.groupId && avSizes.length > 0 && (<div className="mb-4"><label className="block text-[11px] font-bold text-text-soft mb-2 uppercase">Expected Qty by Size</label><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">{avSizes.map((sz) => (<div key={sz.id}><div className="text-xs text-text-soft text-center mb-1">{sz.name}</div><input type="number" min="0" className="w-full px-2 py-1.5 border border-border-strong rounded text-sm text-center" value={form.expectedQty[sz.id] || ''} onChange={(e) => setForm({ ...form, expectedQty: { ...form.expectedQty, [sz.id]: parseInt(e.target.value) || 0 } })} placeholder="0" /></div>))}</div></div>)}
          <div className="flex gap-2"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (form.id ? 'Update' : 'Create')}</button><button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      </div>)}
      {!form && (<>
                <OrderToggle statusFilter={statusFilter} setStatusFilter={setStatusFilter} FiClock={FiClock} FiCheckCircle={FiCheckCircle} FiList={FiList} />
        <div className="bg-panel border border-border rounded-lg p-4 mb-4">
          <label className="flex items-center gap-1.5 text-sm text-text-soft"><input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} /> Show deleted orders</label>
        </div>
        <OrderFilterBar filt={filt} set={set} F={F} parties={parties} itemTypes={itemTypes} jobWorkers={jobWorkers} fabrics={fabrics} groupOptions={groupOptions} filtered={filtered} statusFilter={statusFilter} />
        <OrderTable filtered={filtered} parties={parties} itemTypes={itemTypes} jobWorkers={jobWorkers} getGroup={getGroup} fabrics={fabrics} statusFilter={statusFilter} toggleStatus={toggleStatus} startEdit={startEdit} handleDelete={handleDelete} />
      </>)}
    </div>
  )
}

function OrderToggle({ statusFilter, setStatusFilter, FiClock, FiCheckCircle, FiList }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-text-soft uppercase mr-2">View:</span>
        <button onClick={() => setStatusFilter('Pending')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${statusFilter === 'Pending' ? 'bg-amber text-white shadow-sm' : 'bg-white border border-border text-text-soft hover:border-amber hover:text-amber'}`}>
          <FiClock size={15} /> Pending
        </button>
        <button onClick={() => setStatusFilter('All')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${statusFilter === 'All' ? 'bg-accent text-white shadow-sm' : 'bg-white border border-border text-text-soft hover:border-accent hover:text-accent'}`}>
          <FiList size={15} /> All Orders
        </button>
        <button onClick={() => setStatusFilter('Completed')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${statusFilter === 'Completed' ? 'bg-green text-white shadow-sm' : 'bg-white border border-border text-text-soft hover:border-green hover:text-green'}`}>
          <FiCheckCircle size={15} /> Completed
        </button>
      </div>
    </div>
  )
}

function OrderFilterBar({ filt, set, F, parties, itemTypes, jobWorkers, fabrics, groupOptions, filtered, statusFilter }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4 mb-4">
      <h3 className="text-sm font-bold mb-3">{statusFilter} Orders <span className="text-xs font-normal text-text-soft">({filtered.length})</span></h3>
      <div className="flex gap-3 flex-wrap items-end">
        <div className="w-40"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Date from</label><input type="date" className={F} value={filt.date_from || ''} onChange={(e) => set('date_from', e.target.value)} /></div>
        <div className="w-40"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Date to</label><input type="date" className={F} value={filt.date_to || ''} onChange={(e) => set('date_to', e.target.value)} /></div>
        <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Party</label><select className={F} value={filt.partyId || ''} onChange={(e) => set('partyId', e.target.value)}><option value="">All parties</option>{parties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Item Type</label><select className={F} value={filt.itemTypeId || ''} onChange={(e) => set('itemTypeId', e.target.value)}><option value="">All item types</option>{itemTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label><select className={F} value={filt.jobWorkerId || ''} onChange={(e) => set('jobWorkerId', e.target.value)}><option value="">All job workers</option>{jobWorkers?.map((jw) => <option key={jw.id} value={jw.id}>{jw.name}</option>)}</select></div>
        <div className="w-56"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Group</label><select className={F} value={filt.groupId || ''} onChange={(e) => set('groupId', e.target.value)}><option value="">All groups</option>{groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
        <div className="w-48"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Fabric / Colour</label><select className={F} value={filt.fabricId || ''} onChange={(e) => set('fabricId', e.target.value)}><option value="">All fabrics</option>{fabrics?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
        <button className="btn" onClick={() => set({})}>Clear filters</button>
      </div>
    </div>
  )
}

function OrderTable({ filtered, parties, itemTypes, jobWorkers, getGroup, fabrics, statusFilter, toggleStatus, startEdit, handleDelete }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
            {!filtered.length ? (<div className="empty-state"><div className="msg">No orders match these filters.</div></div>) : (
        <div className="table-scroll"><table className="w-full border-collapse text-[13.5px]">
          <thead><tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border"><th className="p-2.5">Date</th><th className="p-2.5">Party</th><th className="p-2.5">Item Type</th><th className="p-2.5">Job Worker</th><th className="p-2.5">Group</th><th className="p-2.5">Status</th><th className="p-2.5">Fabric / Colour</th><th className="p-2.5">Expected Qty</th><th className="p-2.5 w-40"></th></tr></thead>
          <tbody>{filtered.map((o) => {
            const party = parties?.find((p) => p.id === o.party_id)
            const it = itemTypes?.find((t) => t.id === o.item_type_id)
            const jw = jobWorkers?.find((j) => j.id === o.job_worker_id)
            const group = getGroup(o.job_worker_id, o.group_id)
            const fabric = fabrics?.find((f) => f.id === o.fabric_id)
            const sizes = group?.group_sizes || []
            const expectedStr = sizes.filter((sz) => o.order_expected_qty?.some((e) => e.size_id === sz.id && e.qty)).map((sz) => { const e = o.order_expected_qty.find((x) => x.size_id === sz.id); return sz.name + ':' + e.qty }).join(', ')
            return (<tr key={o.id} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]"><td className="p-2.5">{fmtDate(o.date_created)}</td><td className="p-2.5">{party ? party.name : '—'}</td><td className="p-2.5">{it ? it.name : '—'}</td><td className="p-2.5">{jw ? jw.name : '—'}</td><td className="p-2.5">{group ? group.group_name : '—'}</td><td className="p-2.5"><span className={'badge ' + (o.status === 'Pending' ? 'badge-pending' : 'badge-completed')}>{o.status}</span></td><td className="p-2.5">{fabric ? fabric.name : '—'}</td><td className="p-2.5 text-xs">{expectedStr || '—'}</td><td className="p-2.5 text-right"><button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-accent-soft text-accent hover:bg-accent hover:text-white transition-colors mr-1" onClick={() => startEdit(o)}><FiEdit2 size={12} /> Edit</button><button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-soft text-amber hover:bg-amber hover:text-white transition-colors" onClick={() => toggleStatus(o)}>{o.status === 'Pending' ? 'Complete' : 'Reopen'}</button></td></tr>)
          })}</tbody>
        </table></div>
      )}
    </div>
  )
}

function matchesFilters(filt, o) {
  if (filt.jobWorkerId && o.job_worker_id !== filt.jobWorkerId) return false
  if (filt.itemTypeId && o.item_type_id !== filt.itemTypeId) return false
  if (filt.partyId && o.party_id !== filt.partyId) return false
  if (filt.groupId && o.group_id !== filt.groupId) return false
  if (filt.fabricId && o.fabric_id !== filt.fabricId) return false
  if (filt.date_from && o.date_created < filt.date_from) return false
  if (filt.date_to && o.date_created > filt.date_to) return false
  return true
}
