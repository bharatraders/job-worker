import { FiTrash2, FiPlus } from 'react-icons/fi'

export default function GroupEditor({ group, gi, editing, setEditing, itemTypes, addSize, addPart }) {
  const up = (data) => { const g = [...editing.groups]; g[gi] = { ...g[gi], ...data }; setEditing({ ...editing, groups: g }) }
  const upSize = (si, data) => { const g = [...editing.groups]; g[gi].sizes[si] = { ...g[gi].sizes[si], ...data }; setEditing({ ...editing, groups: g }) }
  const upPart = (pi, data) => { const g = [...editing.groups]; g[gi].parts[pi] = { ...g[gi].parts[pi], ...data }; setEditing({ ...editing, groups: g }) }

  return (
    <div className="section-block">
      <button className="absolute top-2 right-2 text-text-faint hover:text-red" onClick={() => { const g = [...editing.groups]; g.splice(gi, 1); setEditing({ ...editing, groups: g }) }}><FiTrash2 size={14} /></button>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Item Type</label><select className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={group.itemTypeId} onChange={(e) => up({ itemTypeId: e.target.value })}><option value="">Select...</option>{itemTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Group Name</label><input className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={group.groupName} onChange={(e) => up({ groupName: e.target.value })} /></div>
        <div><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Piece Rate (₹)</label><input type="number" step="0.01" className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={group.pieceRate} onChange={(e) => up({ pieceRate: e.target.value })} /></div>
      </div>
      <div className="mb-3"><div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-text-soft uppercase">Sizes</label><button className="text-xs text-accent hover:underline" onClick={() => addSize(gi)}>+ Add</button></div>
        <div className="flex flex-wrap gap-2">{group.sizes.map((sz, si) => (<div key={si} className="flex gap-1 items-center"><input className="w-20 px-2 py-1 border border-border-strong rounded text-sm" value={sz.name} onChange={(e) => upSize(si, { name: e.target.value })} /><button className="text-text-faint hover:text-red text-xs" onClick={() => { const g = [...editing.groups]; g[gi].sizes.splice(si, 1); setEditing({ ...editing, groups: g }) }}>x</button></div>))}</div>
      </div>
      <div><div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-text-soft uppercase">Parts & BOM</label><button className="text-xs text-accent hover:underline" onClick={() => addPart(gi)}>+ Add Part</button></div>
        {group.parts.map((part, pi) => (
          <div key={pi} className="mb-2 p-2 border border-border rounded">
            <div className="flex gap-2 items-center mb-2"><input className="flex-1 px-2 py-1 border border-border-strong rounded text-sm" value={part.partName} onChange={(e) => upPart(pi, { partName: e.target.value })} placeholder="Part name" /><button className="text-text-faint hover:text-red text-xs" onClick={() => { const g = [...editing.groups]; g[gi].parts.splice(pi, 1); setEditing({ ...editing, groups: g }) }}>x</button></div>
            {group.sizes.length > 0 && (<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">{group.sizes.map((sz) => (<div key={sz.id}><div className="text-[10px] text-text-soft text-center">{sz.name}</div><input type="number" step="0.1" className="w-full px-1 py-1 border border-border-strong rounded text-xs text-center" value={part.bom[sz.id] || ''} onChange={(e) => { const bom = { ...part.bom, [sz.id]: e.target.value }; upPart(pi, { bom }) }} placeholder="cm" /></div>))}</div>)}
          </div>
        ))}
      </div>
    </div>
  )
}
