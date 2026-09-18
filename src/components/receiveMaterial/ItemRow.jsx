import { FiTrash2 } from 'react-icons/fi'
import Combo from '../ui/Combo'

const F = 'w-full px-3 py-2 border border-border-strong rounded-md text-sm'

export default function ItemRow({ item, iIdx, form, setForm, itemTypes, parties, fabrics, getGroups, getSizes, getParts, rmItem, onSelectItemType, onItemTypeText, onAddNewItemType }) {
  const sizes = getSizes(form.jobWorkerId, item.groupId)
  const parts = getParts(form.jobWorkerId, item.groupId)
  const rt = Object.values(item.sizeWise).reduce((s, v) => s + (Number(v) || 0), 0)
  const up = (data) => { const items = [...form.items]; items[iIdx] = { ...items[iIdx], ...data }; setForm({ ...form, items }) }

  return (
    <div className="section-block">
      <button className="absolute top-2 right-2 text-text-faint hover:text-red" onClick={() => rmItem(iIdx)}><FiTrash2 size={14} /></button>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Item Type</label><Combo list={Array.isArray(itemTypes) ? itemTypes : []} value={item.itemTypeId} placeholder="Search item type..." onSelect={(id) => (onSelectItemType ? onSelectItemType(iIdx, id) : up({ itemTypeId: id, groupId: '', partFabric: {} }))} onAddNew={onAddNewItemType} onChange={(text) => { if (!text && item.itemTypeId) { if (onItemTypeText) onItemTypeText(iIdx); else up({ itemTypeId: '', groupId: '', partFabric: {}, sizeWise: {} }) } }} className={F} /></div>
        <div><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Party</label><select className={F} value={item.partyId} onChange={(e) => up({ partyId: e.target.value })}><option value="">Select...</option>{parties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Group</label><select className={F} value={item.groupId} onChange={(e) => up({ groupId: e.target.value, partFabric: {}, sizeWise: {} })}><option value="">Select...</option>{getGroups(form.jobWorkerId, item.itemTypeId).map((g) => <option key={g.id} value={g.id}>{g.group_name}</option>)}</select></div>
      </div>
      {item.groupId && (<>
        {parts.length > 0 && (<div className="mb-3"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Fabric per Part</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{parts.map((p) => (<div key={p.id} className="flex gap-1 items-center"><span className="text-xs text-text-soft truncate">{p.part_name}</span><select className="flex-1 px-2 py-1 border border-border-strong rounded text-xs" value={item.partFabric[p.id] || ''} onChange={(e) => up({ partFabric: { ...item.partFabric, [p.id]: e.target.value } })}><option value="">—</option>{fabrics?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>))}</div></div>)}
        {sizes.length > 0 && (<div className="mb-2"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Pieces by Size</label><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">{sizes.map((sz) => (<div key={sz.id}><div className="text-xs text-text-soft text-center mb-1">{sz.name}</div><input type="number" min="0" className="w-full px-2 py-1.5 border border-border-strong rounded text-sm text-center" value={item.sizeWise[sz.id] || ''} onChange={(e) => up({ sizeWise: { ...item.sizeWise, [sz.id]: parseInt(e.target.value) || 0 } })} placeholder="0" /></div>))}</div><div className="text-xs font-bold mt-2">Row: <span className={rt > 0 ? 'text-green' : 'text-text-faint'}>{rt > 0 ? rt + ' pcs' : '—'}</span></div></div>)}
      </>)}
    </div>
  )
}
