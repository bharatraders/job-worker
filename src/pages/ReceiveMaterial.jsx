import { useNavigate } from 'react-router-dom'
import { useApiCall, useMutation } from '../hooks/useApiCall'
import { fetchReceiveMaterial, deleteReceiveMaterial } from '../features/receiveMaterial/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fetchItemTypes, fetchParties, fetchFabrics } from '../features/masters/api'
import { showToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmModal'
import { FiPlus } from 'react-icons/fi'
import { ReceiveChallanCard } from '../components/ChallanCards'

export default function ReceiveMaterial() {
  const navigate = useNavigate()
  const { data: entries, loading, error, refetch } = useApiCall(fetchReceiveMaterial, [], 'receiveMaterial')
  const { data: jobWorkers } = useApiCall(fetchJobWorkers, [], 'jobWorkers')
  const { data: itemTypes } = useApiCall(fetchItemTypes, [], 'itemTypes')
  const { data: parties } = useApiCall(fetchParties, [], 'parties')
  const { data: fabrics } = useApiCall(fetchFabrics, [], 'fabrics')
  const { mutate: remove } = useMutation(deleteReceiveMaterial)
  const { confirm } = useConfirm()

  function startNew() { navigate('/receive-material/new') }
  function startEdit(e) { navigate('/receive-material/new', { state: { editEntry: e } }) }

  async function handleDelete(id) { const ok = await confirm({ title: 'Delete Entry', message: 'This entry will be permanently deleted. This action cannot be undone.', type: 'danger', confirmText: 'Delete', }); if (!ok) return; try { await remove(id); showToast('Deleted'); refetch() } catch (err) { showToast('Failed: ' + err.message) } }
  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3"><h2 className="text-base font-bold">Receive Entries ({entries?.length || 0})</h2><button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber text-white shadow-sm hover:bg-amber-600 transition-colors" onClick={startNew}><FiPlus size={16} /> New Entry</button></div>
        {!entries?.length ? (<div className="empty-state"><div className="msg">No receive entries yet.</div></div>) : (<div className="space-y-3">{entries.map((e) => <ReceiveChallanCard key={e.id} e={e} jobWorkers={jobWorkers} itemTypes={itemTypes} parties={parties} fabrics={fabrics} onEdit={startEdit} onDelete={(ent) => handleDelete(ent.id)} />)}</div>)}
      </div>
    </div>
  )
}
