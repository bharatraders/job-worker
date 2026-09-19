import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchJobWorkerById, upsertJobWorker } from '../../features/masters/jobWorkersApi'
import { sortSizes, compareSizeNames } from '../../lib/sizes'
import { fetchItemTypes } from '../../features/masters/api'
import { showToast } from '../../components/ui/Toast'
import { FiArrowLeft } from 'react-icons/fi'

/**
 * JobWorkerEdit — dedicated edit page for one job worker.
 * Opened from the Job Workers list via /masters/job-workers/:id so the long
 * worker list stays out of the way while editing. The Back button returns to
 * the list with the Job Workers tab selected.
 */

function toEditing(jw) {
  return {
    id: jw.id,
    name: jw.name,
    phone: jw.phone || '',
    groups: (jw.groups || []).map((g) => ({
      id: g.id,
      itemTypeId: g.item_type_id,
      groupName: g.group_name,
      pieceRate: g.piece_rate,
      photo: g.photo || null,
      sizes: sortSizes(g.group_sizes || []).map((s) => ({ id: s.id, name: s.name })),
      parts: (g.group_parts || []).map((p) => ({
        id: p.id,
        partName: p.part_name,
        bom: Object.fromEntries((p.group_part_bom || []).map((b) => [b.size_id, b.cm_per_piece])),
      })),
    })),
  }
}

export default function JobWorkerEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(null)
  const [workerName, setWorkerName] = useState('')
  const [itemTypes, setItemTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newGroupItemType, setNewGroupItemType] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupRate, setNewGroupRate] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const [jw, types] = await Promise.all([fetchJobWorkerById(id), fetchItemTypes()])
        if (cancelled) return
        setWorkerName(jw.name)
        setEditing(toEditing(jw))
        setItemTypes(types)
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load job worker')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  function back() {
    navigate('/masters', { state: { tab: 'jobWorkers' } })
  }

  function addGroup() {
    setEditing({ ...editing, groups: [...editing.groups, { id: null, itemTypeId: '', groupName: '', pieceRate: '', photo: null, sizes: [], parts: [] }] })
  }

  function removeGroup(gi) {
    const g = [...editing.groups]
    g.splice(gi, 1)
    setEditing({ ...editing, groups: g })
  }

  function addSizeByName(gi, name) {
    const g = [...editing.groups]
    if (!name.trim()) return
    if (g[gi].sizes.some((s) => s.name && s.name.toLowerCase() === name.toLowerCase())) {
      showToast('Size already exists')
      return
    }
    g[gi].sizes.push({ id: null, name: name.trim() })
    g[gi].sizes.sort((a, b) => compareSizeNames(a.name, b.name))
    setEditing({ ...editing, groups: g })
  }

  function removeSize(gi, si) {
    const g = [...editing.groups]
    g[gi].sizes.splice(si, 1)
    setEditing({ ...editing, groups: g })
  }

  function addPart(gi) {
    const g = [...editing.groups]
    g[gi].parts.push({ id: null, partName: '', bom: {} })
    setEditing({ ...editing, groups: g })
  }

  function removePart(gi, pi) {
    const g = [...editing.groups]
    g[gi].parts.splice(pi, 1)
    setEditing({ ...editing, groups: g })
  }

  function updateGroup(gi, data) {
    const g = [...editing.groups]
    g[gi] = { ...g[gi], ...data }
    setEditing({ ...editing, groups: g })
  }

  function updatePart(gi, pi, data) {
    const g = [...editing.groups]
    g[gi].parts[pi] = { ...g[gi].parts[pi], ...data }
    setEditing({ ...editing, groups: g })
  }

  function updatePartBom(gi, pi, sizeKey, value) {
    const g = [...editing.groups]
    const v = value === '' ? '' : parseFloat(value)
    g[gi].parts[pi].bom = { ...g[gi].parts[pi].bom, [sizeKey]: v }
    setEditing({ ...editing, groups: g })
  }

  function updateGroupPhoto(gi, file) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const g = [...editing.groups]
      g[gi].photo = ev.target.result
      setEditing({ ...editing, groups: g })
    }
    reader.readAsDataURL(file)
  }

  function removeGroupPhoto(gi) {
    const g = [...editing.groups]
    g[gi].photo = null
    setEditing({ ...editing, groups: g })
  }

  function addNewGroup() {
    if (!newGroupItemType) return showToast('Select item type')
    if (!newGroupName.trim()) return showToast('Enter group name')
    const rate = parseFloat(newGroupRate)
    if (isNaN(rate)) return showToast('Enter piece rate')
    setEditing({
      ...editing,
      groups: [...editing.groups, {
        id: null,
        itemTypeId: newGroupItemType,
        groupName: newGroupName.trim(),
        pieceRate: rate,
        photo: null,
        sizes: [],
        parts: []
      }]
    })
    setNewGroupItemType('')
    setNewGroupName('')
    setNewGroupRate('')
  }

  async function handleSave() {
    if (!editing.name.trim()) return showToast('Enter job worker name')
    setSaving(true)
    try {
      const payload = {
        id: editing.id,
        name: editing.name.trim(),
        phone: editing.phone.trim(),
        groups: editing.groups.map((g) => ({
          id: g.id === null ? undefined : g.id,
          itemTypeId: g.itemTypeId,
          groupName: g.groupName.trim(),
          pieceRate: parseFloat(g.pieceRate) || 0,
          photo: g.photo || null,
          sizes: sortSizes(g.sizes).map((s) => ({ id: s.id === null ? undefined : s.id, name: s.name.trim() })),
          parts: g.parts.map((p) => ({
            id: p.id === null ? undefined : p.id,
            partName: p.partName.trim(),
            bom: Object.fromEntries(
              Object.entries(p.bom).map(([sid, v]) => [sid, v])
            ),
          })),
        })),
      }
      await upsertJobWorker(payload)
      showToast('Saved')
      navigate('/masters', { state: { tab: 'jobWorkers' } })
    } catch (err) {
      const msg = err?.message || String(err)
      const flat = msg.replace(/\s+/g, ' ').trim()
      showToast(`Failed: ${flat}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4 text-text-soft">Loading job worker…</div>


  if (loadError) return (
    <div className="p-4">
      <button className="btn btn-sm flex items-center gap-1.5 mb-3" onClick={back}><FiArrowLeft size={14} /> Back to Job Workers</button>
      <div className="text-red">Error: {loadError}</div>
    </div>
  )
  if (!editing) return null

  return (
    <div className="p-4">
      <button className="btn btn-sm flex items-center gap-1.5 mb-3" onClick={back}><FiArrowLeft size={14} /> Back to Job Workers</button>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex-between" style={{ padding: '14px 18px', background: '#fafbfc' }}>
          <h2 style={{ margin: 0 }}>Edit Job Worker — {workerName}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="btn btn-sm" onClick={back}>Cancel</button>
          </div>
        </div>
        <EditForm
          editing={editing} setEditing={setEditing} itemTypes={itemTypes}
          addNewGroup={addNewGroup} newGroupItemType={newGroupItemType}
          setNewGroupItemType={setNewGroupItemType} newGroupName={newGroupName}
          setNewGroupName={setNewGroupName} newGroupRate={newGroupRate}
          setNewGroupRate={setNewGroupRate} removeGroup={removeGroup}
          updateGroup={updateGroup} updateGroupPhoto={updateGroupPhoto}
          removeGroupPhoto={removeGroupPhoto} removeSize={removeSize}
          addSizeByName={addSizeByName} addPart={addPart} removePart={removePart}
          updatePart={updatePart} updatePartBom={updatePartBom}
        />
      </div>
    </div>
  )
}


function EditForm(props) {
  const { editing, setEditing, itemTypes } = props
  const { addNewGroup, newGroupItemType, setNewGroupItemType, newGroupName } = props
  const { setNewGroupName, newGroupRate, setNewGroupRate, removeGroup } = props
  const { updateGroup, updateGroupPhoto, removeGroupPhoto, removeSize } = props
  const { addSizeByName, addPart, removePart, updatePart, updatePartBom } = props
  return (
    <div className="p-3" style={{ paddingTop: 12, paddingBottom: 12, paddingLeft: 18, paddingRight: 18 }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field"><label>Name</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Job worker name" /></div>
        <div className="field"><label>Phone</label><input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="Phone number" /></div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <label style={{ fontWeight: 700, fontSize: 13 }}>Groups</label>
        {editing.groups.length === 0 && <div className="muted small" style={{ marginBottom: 10 }}>No groups yet.</div>}
        {editing.groups.map((g, gi) => (
          <GroupBlock
            key={g.id || gi} g={g} gi={gi} itemTypes={itemTypes}
            removeGroup={removeGroup} updateGroup={updateGroup}
            updateGroupPhoto={updateGroupPhoto} removeGroupPhoto={removeGroupPhoto}
            removeSize={removeSize} addSizeByName={addSizeByName}
            addPart={addPart} removePart={removePart}
            updatePart={updatePart} updatePartBom={updatePartBom}
          />
        ))}
        <div className="section-block" style={{ background: '#f7f8fa' }}>
          <div className="small muted" style={{ marginBottom: 8, fontWeight: 700 }}>Add new group</div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field"><label>Item Type</label>
              <select value={newGroupItemType} onChange={(e) => setNewGroupItemType(e.target.value)}>
                <option value="">Select...</option>
                {itemTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Group Name</label><input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Half Sleeve" /></div>
            <div className="field"><label>Piece Rate</label><input type="number" step="0.01" value={newGroupRate} onChange={(e) => setNewGroupRate(e.target.value)} placeholder="0.00" /></div>
            <div className="field" style={{ flex: 0 }}><button className="btn btn-sm btn-primary" onClick={addNewGroup}>+ Add group</button></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GroupBlock(props) {
  const { g, gi, itemTypes, removeGroup, updateGroup } = props
  const { updateGroupPhoto, removeGroupPhoto, removeSize, addSizeByName } = props
  const { addPart, removePart, updatePart, updatePartBom } = props
  return (
    <div className="section-block" style={{ marginBottom: 12 }}>
      <div className="flex-between" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: 13 }}>Group {gi + 1}</b>
        <button className="btn btn-sm btn-ghost" style={{ color: 'red' }} onClick={() => removeGroup(gi)}>Remove group</button>
      </div>
      <div className="row">
        <div className="field"><label>Item Type</label>
          <select value={g.itemTypeId} onChange={(e) => updateGroup(gi, { itemTypeId: e.target.value })}>
            <option value="">Select...</option>
            {itemTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Group Name</label><input value={g.groupName} onChange={(e) => updateGroup(gi, { groupName: e.target.value })} placeholder="e.g. Full Sleeve" /></div>
        <div className="field"><label>Piece Rate (₹)</label><input type="number" step="0.01" value={g.pieceRate} onChange={(e) => updateGroup(gi, { pieceRate: e.target.value })} placeholder="0.00" /></div>
      </div>
      <div className="mt10" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {g.photo ? <img src={g.photo} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} /> : <div style={{ width: 56, height: 56, background: '#eef0f3', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📷</div>}
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600 }}>Group Photo (optional)</label>
          <div><input type="file" accept="image/*" style={{ fontSize: 12, marginTop: 4 }} onChange={(e) => { const file = e.target.files[0]; if (file) updateGroupPhoto(gi, file) }} /></div>
          {g.photo && <button className="btn btn-sm btn-ghost" style={{ fontSize: 11, padding: '3px 7px', marginTop: 4 }} onClick={() => removeGroupPhoto(gi)}>Remove photo</button>}
        </div>
      </div>
      <div className="mt12">
        <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-soft)' }}>Sizes</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {g.sizes.map((s, si) => (
            <span key={si} className="tag" style={{ display: 'inline-flex', margin: '2px', alignItems: 'center', padding: '2px 8px', background: 'white', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
              {s.name || 'unnamed'}
              <span style={{ cursor: 'pointer', marginLeft: 6, color: 'red' }} onClick={() => removeSize(gi, si)}>&times;</span>
            </span>
          ))}
        </div>
        <div className="row mt8" style={{ alignItems: 'center' }}>
          <div className="field" style={{ maxWidth: 140 }}><input placeholder="e.g. S, 32" onKeyDown={(e) => { if (e.key === 'Enter') { addSizeByName(gi, e.target.value); e.target.value = '' } }} /></div>
          <div className="field" style={{ flex: 0 }}><button className="btn btn-sm" onClick={(e) => { const inp = e.target.closest('.row').querySelector('input'); addSizeByName(gi, inp.value); inp.value = '' }}>+ Size</button></div>
        </div>
      </div>
      <div className="mt12" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <div className="flex-between">
          <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-soft)' }}>Parts &amp; BOM (cm/piece)</label>
          <button className="btn btn-sm" onClick={() => addPart(gi)}>+ Add part</button>
        </div>
        {g.parts.length === 0 && <div className="muted small mt8">No parts yet.</div>}
        <div className="mt8">
          {g.parts.map((p, pi) => (
            <div key={pi} className="section-block" style={{ marginBottom: 8 }}>
              <div className="row" style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                <div className="field"><label>Part Name</label><input value={p.partName} onChange={(e) => updatePart(gi, pi, { partName: e.target.value })} placeholder="e.g. Main, Upper, Lower" /></div>
                <div className="field" style={{ flex: 0 }}><button className="btn btn-sm btn-ghost" style={{ color: 'red' }} onClick={() => removePart(gi, pi)}>Remove</button></div>
              </div>
              {g.sizes.length === 0 ? <div className="muted small">Add sizes first (above) before entering BOM.</div> : (
                <div>
                  <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-soft)' }}>BOM (cm/piece by size)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(85px,1fr))', gap: 8, marginTop: 6 }}>
                    {g.sizes.map((sz) => {
                      const sizeKey = sz.id || sz.name
                      return (
                        <div key={sizeKey}>
                          <div className="small muted" style={{ marginBottom: 3, textAlign: 'center' }}>{sz.name || 'unnamed'}</div>
                          <input type="number" step="0.1" placeholder="cm" value={p.bom[sizeKey] !== undefined && p.bom[sizeKey] !== '' ? p.bom[sizeKey] : ''} onChange={(e) => updatePartBom(gi, pi, sizeKey, e.target.value)} style={{ width: '100%', padding: 6, textAlign: 'center', border: '1px solid var(--border-strong)', borderRadius: 5, fontSize: 12 }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

