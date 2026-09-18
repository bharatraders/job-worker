import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useApiCall, useMutation } from '../hooks/useApiCall'
import { fetchIssueFabric, upsertIssueFabric, deleteIssueFabric } from '../features/issueFabric/api'
import { fetchFabrics, upsertFabric } from '../features/masters/api'
import { fetchJobWorkers, upsertJobWorker } from '../features/masters/jobWorkersApi'
import { fetchOrders } from '../features/orders/api'
import { showToast } from '../components/ui/Toast'
import { fmtDate, fmtNum, todayStr } from '../lib/format'
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiArrowLeft } from 'react-icons/fi'
import { IssueChallanCard } from '../components/ChallanCards'
import Combo from '../components/ui/Combo'
import { useConfirm } from '../components/ui/ConfirmModal'

const F = 'w-full px-3 py-2 border border-border-strong rounded-md text-sm'
const DRAFT_KEY = 'jwt_draft_issueFabric'

// Draft helpers (from jobwork_v3.html pattern)
function saveDraft(state) {
  if (!state) return
  // Don't save if editing existing entry
  if (state.id) return
  // Only save if meaningful data exists
  const hasData = state.challanNo || state.jobWorkerId ||
    (state.fabricBlocks && state.fabricBlocks.some(b => b.fabricId || b.lumps.some(l => l.metres !== '')))
  if (!hasData) {
    localStorage.removeItem(DRAFT_KEY)
    return
  }
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state))
  } catch (e) { /* ignore */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch (e) { /* ignore */ }
}

function freshForm() {
  return {
    id: null,
    challanNo: '',
    date: todayStr(),
    jobWorkerId: '',
    orderId: '',
    fabricBlocks: [{ id: null, fabricId: '', lumps: [{ id: null, lumpNo: '1', metres: '' }] }]
  }
}

export default function IssueFabric() {
  const { data: entries, loading, error, refetch } = useApiCall(fetchIssueFabric, [], 'issueFabric')
  const { data: fabrics, refetch: refetchFabrics } = useApiCall(fetchFabrics, [], 'fabrics')
  const { data: jobWorkers, refetch: refetchJobWorkers } = useApiCall(fetchJobWorkers, [], 'jobWorkers')
  const { data: orders } = useApiCall(fetchOrders, [], 'orders')
  const { mutate: save, loading: saving } = useMutation(upsertIssueFabric)
  const { mutate: remove } = useMutation(deleteIssueFabric)
  const [form, setForm] = useState(null)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const location = useLocation()
  const { confirm } = useConfirm()

  // Support edit routing from History
  useEffect(() => {
    const editEntry = location.state?.editEntry
    if (editEntry) startEdit(editEntry)
  }, [location.state])

  // Restore draft on mount if no form is active
  useEffect(() => {
    if (!form) {
      const draft = loadDraft()
      if (draft && !draft.id) {
        const hasData = draft.challanNo || draft.jobWorkerId ||
          (draft.fabricBlocks && draft.fabricBlocks.some(b => b.fabricId || b.lumps.some(l => l.metres !== '')))
        if (hasData) {
          setForm(draft)
          setShowDraftBanner(true)
        }
      }
    }
  }, [])

  // Auto-save draft whenever form changes
  useEffect(() => {
    if (form && !form.id) {
      saveDraft(form)
    }
  }, [form])

  function startNew() {
    clearDraft()
    setShowDraftBanner(false)
    setForm(freshForm())
  }

  function startEdit(e) {
    setForm({
      id: e.id,
      challanNo: e.challan_no,
      date: e.date,
      jobWorkerId: e.job_worker_id,
      orderId: e.order_id || '',
      fabricBlocks: e.issue_fabric_blocks?.map((b) => ({
        id: b.id,
        fabricId: b.fabric_id,
        lumps: b.issue_fabric_lumps?.map((l) => ({ id: l.id, lumpNo: l.lump_no, metres: l.metres })) || [{ id: null, lumpNo: '1', metres: '' }]
      })) || [{ id: null, fabricId: '', lumps: [{ id: null, lumpNo: '1', metres: '' }] }]
    })
    setShowDraftBanner(false)
  }

  function addBlock() {
    setForm({
      ...form,
      fabricBlocks: [...form.fabricBlocks, { id: null, fabricId: '', lumps: [{ id: null, lumpNo: '1', metres: '' }] }]
    })
  }

  function rmBlock(i) {
    setForm({ ...form, fabricBlocks: form.fabricBlocks.filter((_, idx) => idx !== i) })
  }

  function addLump(bi) {
    const fb = [...form.fabricBlocks]
    fb[bi].lumps.push({ id: null, lumpNo: String(fb[bi].lumps.length + 1), metres: '' })
    setForm({ ...form, fabricBlocks: fb })
  }

  function rmLump(bi, li) {
    const fb = [...form.fabricBlocks]
    fb[bi].lumps = fb[bi].lumps.filter((_, idx) => idx !== li)
    setForm({ ...form, fabricBlocks: fb })
  }

  async function handleSave() {
    if (!form.challanNo.trim()) return showToast('Enter challan number')
    if (!form.jobWorkerId) return showToast('Select job worker')
    try {
      await save({
        id: form.id,
        challanNo: form.challanNo,
        date: form.date,
        jobWorkerId: form.jobWorkerId,
        orderId: form.orderId,
        fabricBlocks: form.fabricBlocks
      })
      showToast(form.id ? 'Updated' : 'Saved')
      clearDraft()
      setShowDraftBanner(false)
      setForm(null)
      refetch()
    } catch (err) {
      showToast('Failed: ' + err.message)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: 'Delete Entry',
      message: 'This entry will be permanently deleted. This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
    })
    if (!ok) return
    try {
      await remove(id)
      showToast('Deleted')
      refetch()
    } catch (err) {
      showToast('Failed: ' + err.message)
    }
  }

  // Handle adding new fabric from combo
  async function handleAddFabric(name) {
    try {
      const newFabric = await upsertFabric({ id: null, name })
      showToast('Fabric added')
      refetchFabrics()
      return newFabric.id
    } catch (err) {
      showToast('Failed to add fabric: ' + err.message)
      return null
    }
  }

  // Handle adding new job worker from combo
  async function handleAddJobWorker(name) {
    try {
      const newJw = await upsertJobWorker({ id: null, name, phone: '', groups: [] })
      showToast('Job worker added')
      refetchJobWorkers()
      return newJw.id
    } catch (err) {
      showToast('Failed to add job worker: ' + err.message)
      return null
    }
  }

  function handleCancel() {
    clearDraft()
    setShowDraftBanner(false)
    setForm(null)
  }

  function handleDiscardDraft() {
    clearDraft()
    setShowDraftBanner(false)
    setForm(freshForm())
  }
  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  // If form is active, show ONLY the new entry form (not the issued entries list)
  if (form) {
    // Compute block total for a specific block
    const blockTotal = (bIdx) => {
      const b = form.fabricBlocks[bIdx]
      if (!b) return 0
      return b.lumps.reduce((sum, l) => sum + (parseFloat(l.metres) || 0), 0)
    }

    // Compute grand total across all blocks
    const grandTotal = form.fabricBlocks.reduce((sum, b) => sum + b.lumps.reduce((s2, l) => s2 + (parseFloat(l.metres) || 0), 0), 0)

    return (
      <div>
        {/* Draft banner */}
        {showDraftBanner && (
          <div className="bg-green-50 border border-green-500 rounded-lg p-3 mb-4 flex items-center justify-between text-sm font-bold text-green-700">
            <span>✓ Draft saved — your work is safe</span>
            <button className="text-text-soft text-xs hover:underline" onClick={handleDiscardDraft}>Discard draft</button>
          </div>
        )}

        {/* Editing banner */}
        {form.id && (
          <div className="bg-accent-soft border border-accent rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="text-sm font-bold text-accent-dark">Editing Issue Entry — Challan #{form.challanNo}</div>
            <button className="btn btn-sm" onClick={handleCancel}>Cancel edit</button>
                    </div>
        )}

        {/* Back button */}
        <div className="mb-4">
          <button className="btn btn-sm flex items-center gap-1" onClick={() => setForm(null)}>
            <FiArrowLeft size={14} /> Back to Entries
          </button>
        </div>

        {/* Challan Details */}
        <div className="bg-panel border border-border rounded-lg p-4 mb-4">
          <h2 className="text-base font-bold mb-3">Challan Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Challan No.</label>
              <input className={F} value={form.challanNo} onChange={(e) => setForm({ ...form, challanNo: e.target.value })} placeholder="Challan / page no." />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Date</label>
              <input type="date" className={F} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label>
              <Combo
                list={jobWorkers?.map(jw => ({ id: jw.id, name: jw.name })) || []}
                value={form.jobWorkerId}
                placeholder="Search or add job worker..."
                onSelect={(id) => setForm({ ...form, jobWorkerId: id, orderId: '' })}
                onAddNew={handleAddJobWorker}
                className={F}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Order (optional)</label>
              <select className={F} value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}>
                <option value="">None</option>
                {orders?.filter(o => o.job_worker_id === form.jobWorkerId).map((o) => (
                  <option key={o.id} value={o.id}>{'Order ' + o.id.slice(0, 8) + ' (' + fmtDate(o.date_created) + ')'}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Fabric Blocks */}
        <div className="bg-panel border border-border rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold">Fabric Blocks</h2>
            <button className="btn btn-sm flex items-center gap-1" onClick={addBlock}><FiPlus size={14} /> Add Block</button>
          </div>
          {form.fabricBlocks.map((block, bIdx) => (
            <div key={bIdx} className="section-block">
              {form.fabricBlocks.length > 1 && (
                <button className="absolute top-2 right-2 text-text-faint hover:text-red" onClick={() => rmBlock(bIdx)}><FiTrash2 size={14} /></button>
              )}
              <div className="flex gap-3 items-end">
                <div className="flex-1 max-w-xs">
                  <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Fabric</label>
                  <Combo
                    list={fabrics?.map(f => ({ id: f.id, name: f.name })) || []}
                    value={block.fabricId}
                    placeholder="Search or add fabric..."
                    onSelect={(id) => {
                      const fb = [...form.fabricBlocks]
                      fb[bIdx].fabricId = id
                      setForm({ ...form, fabricBlocks: fb })
                    }}
                    onAddNew={handleAddFabric}
                    className={F}
                  />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {block.lumps.map((lump, lIdx) => (
                  <div key={lIdx} className="flex gap-2 items-center">
                    <span className="text-xs text-text-soft w-12">Lump {lIdx + 1}</span>
                    <input
                      type="number"
                      step="0.01"
                      className="flex-1 px-2 py-1.5 border border-border-strong rounded text-sm max-w-[180px]"
                      value={lump.metres}
                      onChange={(e) => {
                        const fb = [...form.fabricBlocks]
                        fb[bIdx].lumps[lIdx].metres = e.target.value
                        setForm({ ...form, fabricBlocks: fb })
                      }}
                      placeholder="Metres"
                    />
                    {block.lumps.length > 1 && (
                      <button className="text-text-faint hover:text-red" onClick={() => rmLump(bIdx, lIdx)}><FiTrash2 size={14} /></button>
                    )}
                  </div>
                ))}
                <button className="text-xs text-accent hover:underline" onClick={() => addLump(bIdx)}>+ Add lump</button>
                {/* Block total display */}
                <div className="mt-2 text-xs font-bold text-text-soft">
                  Block total: <span style={{ color: blockTotal(bIdx) > 0 ? 'var(--green)' : 'var(--text-faint)' }}>
                    {blockTotal(bIdx) > 0 ? `${fmtNum(blockTotal(bIdx))} m` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {/* Add Block button below fabric blocks with grand total */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm font-bold text-text-faint">
              {grandTotal > 0 ? `${fmtNum(grandTotal)} m total` : '—'}
            </span>
            <button className="btn btn-sm flex items-center gap-1" onClick={addBlock}><FiPlus size={14} /> Add Block</button>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex gap-2">
            <button className="btn btn-primary flex items-center gap-1.5" onClick={handleSave} disabled={saving}>
              <FiSave size={14} /> {saving ? 'Saving...' : (form.id ? 'Update Issue Entry' : 'Save Issue Entry')}
            </button>
            <button className="btn" onClick={handleCancel}>{form.id ? 'Cancel' : 'Reset Form'}</button>
          </div>
        </div>
      </div>
    )
  }

  // Default view: show issued entries list
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold">Issue Entries ({entries?.length || 0})</h2>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber text-white shadow-sm hover:bg-amber-600 transition-colors"
          onClick={startNew}
        >
          <FiPlus size={16} /> New Entry
        </button>
      </div>
      {!entries?.length ? (
        <div className="empty-state"><div className="msg">No issue entries yet.</div></div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <IssueChallanCard
              key={e.id}
              e={e}
              jobWorkers={jobWorkers}
              fabrics={fabrics}
              onEdit={startEdit}
              onDelete={(ent) => handleDelete(ent.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
