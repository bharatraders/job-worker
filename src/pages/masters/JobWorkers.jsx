import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiCall, useMutation } from '../../hooks/useApiCall'
import { fetchJobWorkers, upsertJobWorker, deleteJobWorker } from '../../features/masters/jobWorkersApi'
import { fetchItemTypes } from '../../features/masters/api'
import { showToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { FiDownload } from 'react-icons/fi'
import { exportJobWorkersCSV } from '../../lib/export'

export default function JobWorkers() {
  const { data: workers, loading, error, refetch } = useApiCall(fetchJobWorkers)
  const { data: itemTypes } = useApiCall(fetchItemTypes)
  const { mutate: save } = useMutation(upsertJobWorker)
  const { mutate: remove } = useMutation(deleteJobWorker)
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState({})
  const [expandedGroups, setExpandedGroups] = useState({})
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const { confirm } = useConfirm()

  function toggle(id) { setExpanded({...expanded, [id]: !expanded[id]}) }
  function toggleGroup(id) { setExpandedGroups({...expandedGroups, [id]: !expandedGroups[id]}) }

  function startEdit(jw) {
    navigate(`/masters/job-workers/${jw.id}`)
  }

  function handleDelete(id, name) {
    confirm({
      title: 'Delete "' + name + '"?',
      message: 'This will also delete all their groups.',
      type: 'danger',
    }).then((ok) => {
      if (!ok) return
      remove(id).then(() => {
        refetch()
        showToast('Deleted')
      })
    })
  }

  function handleAddNewWorker() {
    if (!newName.trim()) return showToast('Enter job worker name')
    save({ id: null, name: newName.trim(), phone: newPhone.trim(), groups: [] }).then(() => {
      refetch()
      setNewName('')
      setNewPhone('')
      showToast('Added "' + newName.trim() + '"')
    })
  }

  function getItemType(id) {
    return itemTypes?.find((t) => t.id === id)
  }

  function fmtNum(n) {
    if (n === undefined || n === null || n === '') return ''
    return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
  }

  if (error) return <div className="p-4">Error: {error}</div>

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Job Workers</h1>
        <button className="btn btn-sm flex items-center gap-1" onClick={() => { if (!workers?.length) return showToast('No workers to export'); exportJobWorkersCSV(workers); showToast('Workers exported to CSV') }}><FiDownload size={12} /> Export Excel</button>
      </div>

            {/* Add Job Worker Form */}
      <div className="card mb-4">
        <h2 style={{ marginBottom: 12 }}>Add Job Worker</h2>
        <div className="row">
          <div className="field"><label>Name</label><input id="jwName" placeholder="Job worker name" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
          <div className="field"><label>Phone (optional)</label><input id="jwPhone" placeholder="10-digit number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
          <div className="field" style={{ flex: 0, alignSelf: 'flex-end' }}><button className="btn btn-primary" id="addJwBtn" onClick={handleAddNewWorker}>+ Add Job Worker</button></div>
        </div>
      </div>

      {/* Worker List */}
      <div id="jwListWrap">
        {loading ? <div>Loading...</div> : workers?.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="ic">&#128100;</div><div className="msg">No job workers yet. Add one above.</div></div></div>
        ) : (
          workers.map((jw) => (
            <div key={jw.id} className="card" style={{ padding: 0, overflow: 'hidden' }} id={'jwCard_' + jw.id}>
                            <div className="flex-between" style={{ padding: '14px 18px', cursor: 'pointer' }} id={'jwHeader_' + jw.id} onClick={() => toggle(jw.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 15, color: 'var(--text-faint)' }}>{expanded[jw.id] ? '▼' : '▶'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{jw.name}</div>
                    <div className="small muted">{jw.phone || 'No phone'} · {(jw.groups || []).length} group{(jw.groups || []).length !== 1 ? 's' : ''} · {(jw.groups || []).reduce((s, g) => s + (g.group_sizes?.length || 0), 0)} size{(jw.groups || []).reduce((s, g) => s + (g.group_sizes?.length || 0), 0) !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-sm" onClick={() => startEdit(jw)}>Edit</button>
                  <button className="btn btn-sm btn-ghost" style={{ color: 'red' }} data-id={jw.id} id={'delJw_' + jw.id} onClick={() => handleDelete(jw.id, jw.name)}>Delete</button>
                </div>
              </div>

              <div id={'jwBody_' + jw.id} style={{ display: expanded[jw.id] ? 'block' : 'none', borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                {(jw.groups || []).length === 0 ? (
                  <div className="muted small">No groups yet. Click <b>Edit</b> above to add groups.</div>
                ) : (
                  (jw.groups || []).map((g) => {
                    const it = getItemType(g.item_type_id)
                    const isGExpanded = expandedGroups[g.id]
                    return (
                      <div key={g.id} style={{ border: '1px solid var(--border)', borderRadius: 7, marginBottom: 8, overflow: 'hidden' }}>
                        <div className="flex-between" style={{ padding: '10px 14px', cursor: 'pointer', background: '#fafbfc' }} data-toggle-group={g.id} onClick={() => toggleGroup(g.id)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {g.photo ? <img src={g.photo} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)' }} /> : ''}
                            <div>
                              <b>{g.group_name}</b>
                              <span className="muted small" style={{ marginLeft: 6 }}>{it ? it.name : ''} · ₹{fmtNum(g.piece_rate)}/pc</span>
                            </div>
                          </div>
                          <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>{isGExpanded ? '▾' : '▸'}</span>
                        </div>
                        {isGExpanded && (
                          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                            <div className="mt4"><span className="small muted">Sizes: </span>
                              {(g.group_sizes || []).length === 0 ? <span className="small muted">None</span> : (g.group_sizes || []).map((s) => (
                                <span key={s.id} className="tag" style={{ display: 'inline-flex', margin: '2px', padding: '2px 8px', background: 'white', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>{s.name}</span>
                              ))}
                            </div>
                            <div className="mt8"><span className="small muted">Parts: </span>
                              {(g.group_parts || []).length === 0 ? <span className="small muted">None</span> : (g.group_parts || []).map((p) => (
                                <span key={p.id} className="small">{p.part_name || 'unnamed'}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div className="muted small mt8" style={{ fontStyle: 'italic' }}>Click <b>Edit</b> above to modify groups, sizes, parts, and BOM.</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
