import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApiCall, useMutation } from '../hooks/useApiCall'
import { fetchReceiveMaterial, upsertReceiveMaterial, deleteReceiveMaterial } from '../features/receiveMaterial/api'
import { fetchJobWorkers, upsertJobWorker } from '../features/masters/jobWorkersApi'
import { fetchItemTypes, upsertItemType, fetchParties, upsertParty, fetchFabrics, upsertFabric } from '../features/masters/api'
import { showToast } from '../components/ui/Toast'
import { todayStr } from '../lib/format'
import { FiArrowLeft, FiTrash2 } from 'react-icons/fi'
import ReceiveMaterialForm from '../components/receiveMaterial/ReceiveMaterialForm'

const DRAFT_KEY = 'jwt_draft_receiveMaterial'

const PARTY_TYPES = ['School', 'Retailer', 'Common Stock']

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
  const { data: parties, refetch: refetchParties } = useApiCall(fetchParties, [], 'parties')
  const { data: fabrics, refetch: refetchFabrics } = useApiCall(fetchFabrics, [], 'fabrics')
  const { mutate: save, loading: saving } = useMutation(upsertReceiveMaterial)
  const { mutate: remove } = useMutation(deleteReceiveMaterial)
  const [form, setForm] = useState(null)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  // Pending "+ Add party" request: { iIdx, name } — shown in a small modal
  // so the user can pick the required party type before we insert.
  const [partyModal, setPartyModal] = useState(null)
  const [partyType, setPartyType] = useState(PARTY_TYPES[0])
  const partyResolveRef = useRef(null)

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
      const fresh = await refetchJobWorkers()
      const list = Array.isArray(fresh) ? fresh : jobWorkers || []
      const found = list.find((j) => String(j?.name || '').toLowerCase() === String(name).toLowerCase())
      return found?.id || (typeof created === 'string' ? created : created?.id) || null
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
      const fresh = await refetchItemTypes()
      const list = Array.isArray(fresh) ? fresh : itemTypes || []
      const found = list.find((t) => String(t?.name || '').toLowerCase() === String(name).toLowerCase())
      return found?.id || created?.id || null
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

  // ── Party Combo (same layout as Job Worker): type to search, "+ Add" when
  // no match. "+ Add" opens a small type picker first, because parties
  // require a type (School / Retailer / Common Stock) — then the party is
  // created and auto-selected in that row.
  async function addNewParty(iIdx, name) {
    setPartyType(PARTY_TYPES[0])
    setPartyModal({ iIdx, name })
    // Return a promise that resolves to the new id (or null on cancel).
    // Combo awaits this, so the box stays open until the modal resolves.
    return new Promise((resolve) => {
      partyResolveRef.current = resolve
    })
  }

  async function confirmAddParty() {
    const pending = partyModal
    const resolve = partyResolveRef.current
    if (!pending) { resolve?.(null); return }
    const { iIdx, name } = pending
    try {
      const created = await upsertParty({ name, type: partyType })
      showToast('Party added')
      const fresh = await refetchParties()
      const list = Array.isArray(fresh) ? fresh : parties || []
      const found = list.find((p) => String(p?.name || '').toLowerCase() === String(name).toLowerCase())
      const newId = found?.id || created?.id || null
      if (newId) handleSelectParty(iIdx, newId)
      setPartyModal(null)
      partyResolveRef.current = null
      resolve?.(newId)
    } catch (err) {
      showToast('Failed: ' + err.message)
      setPartyModal(null)
      partyResolveRef.current = null
      resolve?.(null)
    }
  }

  function cancelAddParty() {
    setPartyModal(null)
    partyResolveRef.current?.(null)
    partyResolveRef.current = null
  }
  function handleSelectParty(iIdx, id) {
    setForm((prev) => {
      const items = [...(prev.items || [])]
      if (items[iIdx].partyId === id) return prev
      items[iIdx] = { ...items[iIdx], partyId: id }
      return { ...prev, items }
    })
  }
  function handlePartyText(iIdx) {
    setForm((prev) => {
      const items = [...(prev.items || [])]
      if (!items[iIdx].partyId) return prev
      items[iIdx] = { ...items[iIdx], partyId: '' }
      return { ...prev, items }
    })
  }

  // ── Group Combo (same layout as Job Worker): scoped to the selected Job
  // Worker + Item Type. "+ Add" creates the group under the current worker
  // (piece rate 0, editable later in Masters) so flow never leaves the page.
  async function addNewGroup(iIdx, name) {
    const row = form?.items?.[iIdx]
    const jobWorkerId = form?.jobWorkerId
    if (!jobWorkerId) { showToast('Select job worker first'); return null }
    if (!row?.itemTypeId) { showToast('Select item type first'); return null }
    try {
      const worker = (jobWorkers || []).find((j) => j.id === jobWorkerId)
      if (!worker) { showToast('Job worker not loaded yet'); return null }
      const groups = (worker.groups || []).map((g) => ({
        id: g.id,
        itemTypeId: g.item_type_id,
        groupName: g.group_name,
        pieceRate: g.piece_rate,
        photo: g.photo || null,
        sizes: (g.group_sizes || []).map((s) => ({ id: s.id, name: s.name })),
        parts: (g.group_parts || []).map((p) => ({
          id: p.id,
          partName: p.part_name,
          bom: Object.fromEntries((p.group_part_bom || []).map((b) => [b.size_id, b.cm_per_piece])),
        })),
      }))
      groups.push({ id: null, itemTypeId: row.itemTypeId, groupName: name, pieceRate: 0, photo: null, sizes: [], parts: [] })
      await upsertJobWorker({ id: worker.id, name: worker.name, phone: worker.phone || '', groups })
      showToast('Group added')
      const fresh = await refetchJobWorkers()
      const updated = (Array.isArray(fresh) ? fresh : jobWorkers || []).find((j) => j.id === jobWorkerId)
      const created = (updated?.groups || []).find(
        (g) => g.item_type_id === row.itemTypeId && String(g.group_name || '').toLowerCase() === String(name).toLowerCase()
      )
      if (created) handleSelectGroup(iIdx, created.id)
      return created?.id || null
    } catch (err) { showToast('Failed: ' + err.message); return null }
  }
  function handleSelectGroup(iIdx, id) {
    setForm((prev) => {
      const items = [...(prev.items || [])]
      if (items[iIdx].groupId === id) return prev
      items[iIdx] = { ...items[iIdx], groupId: id, partFabric: {}, sizeWise: {} }
      return { ...prev, items }
    })
  }
  function handleGroupText(iIdx) {
    setForm((prev) => {
      const items = [...(prev.items || [])]
      if (!items[iIdx].groupId) return prev
      items[iIdx] = { ...items[iIdx], groupId: '', partFabric: {}, sizeWise: {} }
      return { ...prev, items }
    })
  }

  // ── Fabric-per-Part Combo (same layout as Job Worker): one searchable box
  // per part with "+ Add" so a missing fabric/colour never blocks the entry.
  async function addNewPartFabric(iIdx, partId, name) {
    try {
      const created = await upsertFabric({ name })
      showToast('Fabric added')
      const fresh = await refetchFabrics()
      const list = Array.isArray(fresh) ? fresh : fabrics || []
      const found = list.find((f) => String(f?.name || '').toLowerCase() === String(name).toLowerCase())
      const newId = found?.id || created?.id || null
      if (newId) handleSelectPartFabric(iIdx, partId, newId)
      return newId
    } catch (err) { showToast('Failed: ' + err.message); return null }
  }
  function handleSelectPartFabric(iIdx, partId, id) {
    setForm((prev) => {
      const items = [...(prev.items || [])]
      items[iIdx] = { ...items[iIdx], partFabric: { ...(items[iIdx].partFabric || {}), [partId]: id } }
      return { ...prev, items }
    })
  }
  function handlePartFabricText(iIdx, partId) {
    setForm((prev) => {
      const items = [...(prev.items || [])]
      const partFabric = { ...(items[iIdx].partFabric || {}) }
      delete partFabric[partId]
      items[iIdx] = { ...items[iIdx], partFabric }
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
      <ReceiveMaterialForm form={form} setForm={setForm} jobWorkers={jobWorkers} itemTypes={itemTypes} parties={parties} fabrics={fabrics} onSave={handleSave} onCancel={handleCancel} onSelectJobWorker={handleSelectJobWorker} onAddNewJobWorker={addNewJobWorker} onSelectItemType={handleSelectItemType} onItemTypeText={handleItemTypeText} onAddNewItemType={addNewItemType} onSelectParty={handleSelectParty} onPartyText={handlePartyText} onAddNewParty={addNewParty} onSelectGroup={handleSelectGroup} onGroupText={handleGroupText} onAddNewGroup={addNewGroup} onSelectPartFabric={handleSelectPartFabric} onPartFabricText={handlePartFabricText} onAddNewPartFabric={addNewPartFabric} saving={saving} />
      {partyModal && (
        <div className="modal-overlay" onClick={cancelAddParty}>
          <div
            style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, margin: '0 16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add new party"
          >
            <div style={{ padding: '16px 24px', background: '#eff6ff' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                Add new party “{partyModal.name}”
              </h3>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Party Type</label>
              <select
                className="w-full px-3 py-2 border border-border-strong rounded-md text-sm"
                value={partyType}
                onChange={(e) => setPartyType(e.target.value)}
                autoFocus
              >
                {PARTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ padding: '16px 24px', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={cancelAddParty}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', background: '#fff', border: '1px solid #d1d5db', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAddParty}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: 'pointer', minWidth: 90 }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      {form.id && (
        <div className="bg-panel border border-border rounded-lg p-4 mt-4">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-red-soft text-red hover:bg-red hover:text-white transition-colors" onClick={() => handleDelete(form.id)}><FiTrash2 size={14} /> Delete This Entry</button>
        </div>
      )}
    </div>
  )
}
