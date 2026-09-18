import { useState } from 'react'
import { useApiCall, useMutation } from '../../hooks/useApiCall'
import { fetchItemTypes, upsertItemType, deleteItemType } from '../../features/masters/api'
import { fetchJobWorkers } from '../../features/masters/jobWorkersApi'
import { fetchOrders } from '../../features/orders/api'
import { fetchReceiveMaterial } from '../../features/receiveMaterial/api'
import { showToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { FiPlus, FiTrash2, FiEdit2, FiCheck } from 'react-icons/fi'

export default function ItemTypes() {
  const { data: items, loading, error, refetch } = useApiCall(fetchItemTypes)
  const { data: jobWorkers } = useApiCall(fetchJobWorkers)
  const { data: orders } = useApiCall(fetchOrders)
  const { data: receives } = useApiCall(fetchReceiveMaterial)
  const { mutate: saveItem, loading: saving } = useMutation(upsertItemType)
  const { mutate: removeItem } = useMutation(deleteItemType)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const { confirm } = useConfirm()

  async function handleAdd() {
    const name = newName.trim().replace(/\s+/g, ' ')
    if (!name) return showToast('Enter an item type name')
    if (items?.some((x) => x.name.toLowerCase() === name.toLowerCase()))
      return showToast(`"${name}" already exists`)
    try {
      await saveItem({ name })
      showToast(`Added "${name}"`)
      setNewName('')
      refetch()
    } catch (err) {
      showToast(`Failed: ${err.message}`)
    }
  }

  async function handleSaveEdit(id) {
    const name = editName.trim().replace(/\s+/g, ' ')
    if (!name) return showToast('Name cannot be empty')
    try {
      await saveItem({ id, name })
      showToast('Updated')
      setEditingId(null)
      refetch()
    } catch (err) {
      showToast(`Failed: ${err.message}`)
    }
  }

  // Reference: deleteCheck logic inside renderMasters in jobwork_v3.html.
  // Counts usage of the item type in groups, orders, and receive items. Blocks
  // deletion if in use anywhere, with a clear message showing the usage counts.
  function usageCount(id) {
    const inGroups = jobWorkers?.filter((jw) => (jw.groups || []).some((g) => g.item_type_id === id)).length || 0
    const inOrders = orders?.filter((o) => o.item_type_id === id).length || 0
    const inReceives = receives?.filter((r) => (r.receive_items || []).some((it) => it.item_type_id === id)).length || 0
    return { inGroups, inOrders, inReceives, total: inGroups + inOrders + inReceives }
  }

  async function handleDelete(id, name) {
    const usage = usageCount(id)
    if (usage.total > 0) {
      const parts = []
      if (usage.inGroups) parts.push(`${usage.inGroups} group(s)`)
      if (usage.inOrders) parts.push(`${usage.inOrders} order(s)`)
      if (usage.inReceives) parts.push(`${usage.inReceives} receive entr${usage.inReceives === 1 ? 'y' : 'ies'}`)
      return showToast(`Cannot delete "${name}": used in ${parts.join(', ')}. Remove those links first.`)
    }
    const ok = await confirm({
      title: 'Delete Item Type',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
    })
    if (!ok) return
    try {
      await removeItem(id)
      showToast('Deleted')
      refetch()
    } catch (err) {
      showToast(`Failed: ${err.message}`)
    }
  }

  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <h2 className="text-base font-bold mb-3">Add Item Type</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Name</label>
            <input className="w-full px-3 py-2 border border-border-strong rounded-md text-sm focus:outline-none focus:border-accent" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="e.g. Shirt, Pant, Kurta" />
          </div>
          <button className="btn btn-primary flex items-center gap-1.5" onClick={handleAdd} disabled={saving}><FiPlus size={14} /> Add</button>
        </div>
      </div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-3">Item Types ({items?.length || 0})</h2>
        {!items?.length ? (
          <div className="empty-state"><div className="msg">No item types yet.</div></div>
        ) : (
          <div className="table-scroll">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border">
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
                    <td className="p-2.5">
                      {editingId === item.id ? (
                        <input className="w-full px-2 py-1 border border-border-strong rounded text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                      ) : item.name}
                    </td>
                    <td className="p-2.5 text-right">
                      {editingId === item.id ? (
                        <button className="text-green hover:bg-green-soft p-1 rounded" onClick={() => handleSaveEdit(item.id)}><FiCheck size={14} /></button>
                      ) : (
                        <>
                          <button className="text-text-soft hover:text-accent p-1.5" onClick={() => { setEditingId(item.id); setEditName(item.name) }}><FiEdit2 size={14} /></button>
                          <button className="text-text-soft hover:text-red p-1.5" onClick={() => handleDelete(item.id, item.name)}><FiTrash2 size={14} /></button>
                        </>
                      )}
                    </td>
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
