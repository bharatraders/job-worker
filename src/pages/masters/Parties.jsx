import { useState, useEffect } from 'react'
import { useApiCall, useMutation } from '../../hooks/useApiCall'
import { fetchParties, upsertParty, deleteParty } from '../../features/masters/api'
import { showToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { FiPlus, FiTrash2, FiEdit2, FiCheck } from 'react-icons/fi'
import { loadDraft, saveDraftState, clearDraft } from '../../lib/drafts'

const PARTY_TYPES = ['School', 'Retailer', 'Common Stock']
const DRAFT_KEY = 'jwt_draft_masters_parties'

export default function Parties() {
  const { data: items, loading, error, refetch } = useApiCall(fetchParties)
  const { mutate: saveItem, loading: saving } = useMutation(upsertParty)
  const { mutate: removeItem } = useMutation(deleteParty)
  const [newName, setNewName] = useState(() => loadDraft(DRAFT_KEY)?.newName || '')
  const [newType, setNewType] = useState(() => loadDraft(DRAFT_KEY)?.newType || 'School')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('')
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const { confirm } = useConfirm()

  useEffect(() => {
    const draft = loadDraft(DRAFT_KEY)
    if (draft?.newName?.trim()) {
      setNewName(draft.newName)
      if (draft.newType) setNewType(draft.newType)
      setShowDraftBanner(true)
    }
  }, [])

  useEffect(() => {
    saveDraftState(DRAFT_KEY, { newName, newType }, !!newName.trim())
    if (!newName.trim()) setShowDraftBanner(false)
  }, [newName, newType])

  async function handleAdd() {
    const name = newName.trim().replace(/\s+/g, ' ')
    if (!name) return showToast('Enter a party name')
    if (items?.some((x) => x.name.toLowerCase() === name.toLowerCase()))
      return showToast(`${name}" already exists`)
    try { await saveItem({ name, type: newType }); showToast(`Added "${name}"`); setNewName(''); clearDraft(DRAFT_KEY); setShowDraftBanner(false); refetch() }
    catch (err) { showToast(`Failed: ${err.message}`) }
  }
  async function handleSaveEdit(id) {
    const name = editName.trim().replace(/\s+/g, ' ')
    if (!name) return showToast('Name cannot be empty')
    try { await saveItem({ id, name, type: editType }); showToast('Updated'); setEditingId(null); refetch() }
    catch (err) { showToast(`Failed: ${err.message}`) }
  }
  async function handleDelete(id, name) {
    const ok = await confirm({ title: 'Delete Party', message: `Delete "${name}"? This action cannot be undone.`, type: 'danger', confirmText: 'Delete', }); if (!ok) return
    try { await removeItem(id); showToast('Deleted'); refetch() }
    catch (err) { showToast(`Failed: ${err.message}`) }
  }
  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <h2 className="text-base font-bold mb-3">Add Party</h2>
        {showDraftBanner && newName.trim() && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm">
            <span className="font-semibold text-amber-700">Draft restored</span>
            <span className="text-amber-600 ml-2">Your previously unsaved work has been recovered.</span>
            <button className="ml-3 text-xs text-amber-700 hover:underline" onClick={() => { clearDraft(DRAFT_KEY); setNewName(''); setShowDraftBanner(false) }}>Discard</button>
          </div>
        )}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Name</label>
            <input className="w-full px-3 py-2 border border-border-strong rounded-md text-sm focus:outline-none focus:border-accent" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="Party name" />
          </div>
          <div className="w-40">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Type</label>
            <select className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={newType} onChange={(e) => setNewType(e.target.value)}>
              {PARTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="btn btn-primary flex items-center gap-1.5" onClick={handleAdd} disabled={saving}><FiPlus size={14} /> Add</button>
        </div>
      </div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-3">Parties ({items?.length || 0})</h2>
        {!items?.length ? (
          <div className="empty-state"><div className="msg">No parties yet.</div></div>
        ) : (
          <div className="table-scroll">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border">
                  <th className="p-2.5">Name</th><th className="p-2.5">Type</th><th className="p-2.5 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
                    <td className="p-2.5">{editingId === item.id ? (<input className="w-full px-2 py-1 border border-border-strong rounded text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />) : item.name}</td>
                    <td className="p-2.5">{editingId === item.id ? (<select className="px-2 py-1 border border-border-strong rounded text-sm" value={editType} onChange={(e) => setEditType(e.target.value)}>{PARTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>) : (<span className="badge badge-neutral">{item.type}</span>)}</td>
                    <td className="p-2.5 text-right">{editingId === item.id ? (<button className="text-green p-1 rounded" onClick={() => handleSaveEdit(item.id)}><FiCheck size={14} /></button>) : (<><button className="text-text-soft hover:text-accent p-1.5" onClick={() => { setEditingId(item.id); setEditName(item.name); setEditType(item.type) }}><FiEdit2 size={14} /></button><button className="text-text-soft hover:text-red p-1.5" onClick={() => handleDelete(item.id, item.name)}><FiTrash2 size={14} /></button></>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
