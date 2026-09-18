import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApiCall, useMutation } from '../hooks/useApiCall'
import { fetchReceiveMaterial, upsertReceiveMaterial, deleteReceiveMaterial } from '../features/receiveMaterial/api'
import { fetchJobWorkers, upsertJobWorker } from '../features/masters/jobWorkersApi'
import { fetchItemTypes, upsertItemType, fetchParties, fetchFabrics } from '../features/masters/api'
import { showToast } from '../components/ui/Toast'
import { todayStr } from '../lib/format'
import { FiArrowLeft, FiTrash2 } from 'react-icons/fi'
import ReceiveMaterialForm from '../components/receiveMaterial/ReceiveMaterialForm'

const DRAFT_KEY = 'jwt_draft_receiveMaterial'

function saveDraft(state) {
  if (!state || state.id) return
  const hasData = state.challanNo || state.jobWorkerId || state.orderId ||
    (state.items && state.items.some(it => it.itemTypeId || it.partyId || it.groupId ||
      Object.keys(it.sizeWise || {}).length > 0))
  if (!hasData) { localStorage.removeItem(DRAFT_KEY); return }
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)) } catch (e) { /* ignore */ }
}

function loadDraft() {
  try { const r = localStorage.getItem(DRAFT_KEY); return r ? JSON.parse(r) : null } catch (e) { return null }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch (e) { /* ignore */ }
}

function freshForm() {
  return {
    id: null, challanNo: '', date: todayStr(), jobWorkerId: '', orderId: '',
    items: [{ id: null, itemTypeId: '', partyId: '', groupId: '', partFabric: {}, sizeWise: {} }]
  }
}

export default function ReceiveMaterialNew() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: entries, refetch } = useApiCall(fetchReceiveMaterial, [], 'receiveMaterial')
  const { data: jobWorkers, refetch: refetchJobWorkers } = useApiCall(fetchJobWorkers, [], 'jobWorkers')
  const { data: itemTypes, refetch: refetchItemTypes } = useApiCall(fetchItemTypes, [], 'itemTypes')
  const { data: parties } = useApiCall(fetchParties, [], 'parties')
  const { data: fabrics } = useApiCall(fetchFabrics, [], 'fabrics')
  const { mutate: save, loading: saving } = useMutation(upsertReceiveMaterial)
  const { mutate: remove } = useMutation(deleteReceiveMaterial)
  const [form, setForm] = useState(null)
  const [showDraftBanner, setShowDraftBanner] = useState(false)

  useEffect(() => {
    const editEntry = location.state?.editEntry
    if (editEntry) { startEdit(editEntry); return }
    const draft = loadDraft()
    if (draft && !draft.id) {
      const hasData = draft.challanNo || draft.jobWorkerId || draft.orderId ||
        (draft.items && draft.items.some(it => it.itemTypeId || it.partyId || it.groupId ||
          Object.keys(it.sizeWise || {}).length > 0))
      if (hasData) { setForm(draft); setShowDraftBanner(true); return }
    }
    setForm(freshForm())
  }, [])

  useEffect(() => { if (form && !form.id) saveDraft(form) }, [form])

  function startEdit(e) {
    setForm({
      id: e.id, challanNo: e.challan_no, date: e.date,
      jobWorkerId: e.job_worker_id, orderId: e.order_id || '',
      items: e.receive_items?.map((it) => ({
        id: it.id, itemTypeId: it.item_type_id, partyId: it.party_id, groupId: it.group_id,
        partFabric: Object.fromEntries((it.receive_item_part_fabric || []).map((pf) => [pf.part_id, pf.fabric_id])),
        sizeWise: Object.fromEntries((it.receive_item_sizes || []).map((s) => [s.size_id, s.pieces]))
      })) || [{ id: null, itemTypeId: '', partyId: '', groupId: '', partFabric: {}, sizeWise: {} }]
    })
  }

  async function handleSave(payload) {
    try { await save(payload); clearDraft(); showToast(form.id ? 'Updated' : 'Saved'); navigate('/receive-material') }
    catch (err) { showToast('Failed: ' + err.message) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this entry? This action cannot be undone.')) return
    try { await remove(id); showToast('Deleted'); navigate('/receive-material') }
    catch (err) { showToast('Failed: ' + err.message) }
  }

  function handleBack() { saveDraft(form); navigate('/receive-material') }

  // Type-to-search handlers — mirrors the Issue Fabric Job Worker / Fabric
  // Combo behaviour (searchable input, results alongside). Both Job Worker
  // and Item Type support inline "+ Add" creation, exactly like Issue
  // Fabric's Job Worker / Fabric combos.
  async function addNewJobWorker(name) {
    try {
      const created = await upsertJobWorker({ name, phone: '', groups: [] })
      showToast('Job worker added')
      await refetchJobWorkers()
      return created?.id || null
    } catch (err) { showToast('Failed: ' + err.message); return null }
  }
  function handleSelectJobWorker(id) {
    setForm((prev) => {
      if (!prev || prev.jobWorkerId === id) return prev
      return {
        ...prev,
        jobWorkerId: id,
        items: (prev.items || []).map((it) => ({ ...it, groupId: '', partFabric: {}, sizeWise: {} })),
      }
    })
  }
  async function addNewItemType(name) {
    try {
      const created = await upsertItemType({ name })
      showToast('Item type added')
      await refetchItemTypes()
      return created?.id || null
    } catch (err) { showToast('Failed: ' + err.message); return null }
  }
  function handleSelectItemType(iIdx, id) {
    setForm((prev) => {
      const items = [...(prev.items || [])]
      if (items[iIdx].itemTypeId === id) return prev
      items[iIdx] = { ...items[iIdx], itemTypeId: id, groupId: '', partFabric: {} }
      return { ...prev, items }
    })
  }
  function handleItemTypeText(iIdx) {
    // Free text that was never selected resolves to no id: clear the field
    // and reset dependents so stale group/parts/sizes can't linger.
    setForm((prev) => {
      const items = [...(prev.items || [])]
      if (!items[iIdx].itemTypeId) return prev
      items[iIdx] = { ...items[iIdx], itemTypeId: '', groupId: '', partFabric: {}, sizeWise: {} }
      return { ...prev, items }
    })
  }

  function handleCancel() {
    if (form.id) { navigate('/receive-material') }
    else { clearDraft(); setForm(freshForm()); setShowDraftBanner(false) }
  }

  if (!form) return <div className="text-text-soft p-8">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-panel border border-border hover:bg-panel/80 transition-colors" onClick={handleBack} title="Back to list (draft saved)"><FiArrowLeft size={16} /> Back</button>
        <h1 className="text-lg font-bold">{form.id ? 'Edit Receive Entry' : 'New Receive Entry'}</h1>
      </div>
      {showDraftBanner && !form.id && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
          <span className="font-semibold text-amber-700">Draft restored</span>
          <span className="text-amber-600 ml-2">Your previously unsaved work has been recovered. Continue editing or save when ready.</span>
        </div>
      )}
      <ReceiveMaterialForm form={form} setForm={setForm} jobWorkers={jobWorkers} itemTypes={itemTypes} parties={parties} fabrics={fabrics} onSave={handleSave} onCancel={handleCancel} onSelectJobWorker={handleSelectJobWorker} onAddNewJobWorker={addNewJobWorker} onSelectItemType={handleSelectItemType} onItemTypeText={handleItemTypeText} onAddNewItemType={addNewItemType} saving={saving} />
      {form.id && (
        <div className="bg-panel border border-border rounded-lg p-4 mt-4">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-red-soft text-red hover:bg-red hover:text-white transition-colors" onClick={() => handleDelete(form.id)}><FiTrash2 size={14} /> Delete This Entry</button>
        </div>
      )}
    </div>
  )
}
