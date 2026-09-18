import { useState } from 'react'
import { useApiCall, useMutation } from '../../hooks/useApiCall'
import { fetchPartNames, upsertPartName, deletePartName } from '../../features/masters/api'
import { showToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { FiPlus, FiTrash2, FiEdit2, FiCheck } from 'react-icons/fi'

/**
 * Part Names master — add/rename/delete list. Reference: renderMasters "partNames" tab
 * in jobwork_v3.html. NOTE: per the HTML, part names are stored as free text on
 * group_parts (not a foreign key), so there is NO usage-check on delete — any name
 * can be deleted freely.
 */
export default function PartNames() {
  const { data: items, loading, error, refetch } = useApiCall(fetchPartNames)
  const { mutate: saveItem, loading: saving } = useMutation(upsertPartName)
  const { mutate: removeItem } = useMutation(deletePartName)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const { confirm } = useConfirm()

  async function handleAdd() {
    const name = newName.trim().replace(/\s+/g, ' ')
    if (!name) return showToast('Enter a part name')
    if (items?.some((x) => x.name.toLowerCase() === name.toLowerCase()))
      return showToast(`"${name}" already exists`)
    try { await saveItem({ name }); showToast(`Added "${name}"`); setNewName(''); refetch() }
    catch (err) { showToast(`Failed: ${err.message}`) }
  }

  async function handleSaveEdit(id) {
    const name = editName.trim().replace(/\s+/g, ' ')
    if (!name) return showToast('Name cannot be empty')
    try { await saveItem({ id, name }); showToast('Updated'); setEditingId(null); refetch() }
    catch (err) { showToast(`Failed: ${err.message}`) }
  }

  async function handleDelete(id, name) {
    const ok = await confirm({ title: 'Delete Part Name', message: `Delete "${name}"? This action cannot be undone.`, type: 'danger', confirmText: 'Delete', }); if (!ok) return
    try { await removeItem(id); showToast('Deleted'); refetch() }
    catch (err) { showToast(`Failed: ${err.message}`) }
  }

  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <h2 className="text-base font-bold mb-3">Add Part Name</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Name</label>
            <input className="w-full px-3 py-2 border border-border-strong rounded-md text-sm focus:outline-none focus:border-accent" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="e.g. Collar, Sleeve, Pocket" />
          </div>
          <button className="btn btn-primary flex items-center gap-1.5" onClick={handleAdd} disabled={saving}><FiPlus size={14} /> Add</button>
        </div>
      </div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-3">Part Names ({items?.length || 0})</h2>
        {!items?.length ? (
          <div className="empty-state"><div className="msg">No part names yet.</div></div>
        ) : (
          <div className="table-scroll"><table className="w-full border-collapse text-[13.5px]">
            <thead><tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border"><th className="p-2.5">Name</th><th className="p-2.5 w-24"></th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
                <td className="p-2.5">{editingId === item.id ? (<input className="w-full px-2 py-1 border border-border-strong rounded text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />) : item.name}</td>
                <td className="p-2.5 text-right">{editingId === item.id ? (<button className="text-green hover:bg-green-soft p-1 rounded" onClick={() => handleSaveEdit(item.id)}><FiCheck size={14} /></button>) : (<><button className="text-text-soft hover:text-accent p-1.5" onClick={() => { setEditingId(item.id); setEditName(item.name) }}><FiEdit2 size={14} /></button><button className="text-text-soft hover:text-red p-1.5" onClick={() => handleDelete(item.id, item.name)}><FiTrash2 size={14} /></button></>)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}