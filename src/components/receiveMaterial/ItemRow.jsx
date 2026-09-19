import { FiTrash2 } from 'react-icons/fi'
import Combo from '../ui/Combo'

const F = 'w-full px-3 py-2 border border-border-strong rounded-md text-sm'

export default function ItemRow({ item, iIdx, form, setForm, itemTypes, parties, fabrics, getGroups, getSizes, getParts, rmItem, onSelectItemType, onItemTypeText, onAddNewItemType, onSelectParty, onPartyText, onAddNewParty, onSelectGroup, onGroupText, onAddNewGroup, onSelectPartFabric, onPartFabricText, onAddNewPartFabric }) {
  const sizes = getSizes(form.jobWorkerId, item.groupId)
  const parts = getParts(form.jobWorkerId, item.groupId)
  const rt = Object.values(item.sizeWise || {}).reduce((s, v) => s + (Number(v) || 0), 0)
  const up = (data) => { const items = [...form.items]; items[iIdx] = { ...items[iIdx], ...data }; setForm({ ...form, items }) }
  const partyList = Array.isArray(parties) ? parties : []
  const fabricList = Array.isArray(fabrics) ? fabrics : []
  const groupObjs = getGroups(form.jobWorkerId, item.itemTypeId) || []
  const groupList = groupObjs.map((g) => ({ id: g.id, name: g.group_name }))
  const groupPlaceholder = !form.jobWorkerId
    ? 'Select job worker first'
    : !item.itemTypeId
      ? 'Select item type first'
      : 'Search group...'

  return (
    <div className="section-block">
      <button className="absolute top-2 right-2 text-text-faint hover:text-red" onClick={() => rmItem(iIdx)}><FiTrash2 size={14} /></button>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Item Type</label><Combo list={Array.isArray(itemTypes) ? itemTypes : []} value={item.itemTypeId} placeholder="Search item type..." onSelect={(id) => (onSelectItemType ? onSelectItemType(iIdx, id) : up({ itemTypeId: id, groupId: '', partFabric: {} }))} onAddNew={onAddNewItemType} onChange={(text) => { if (!text && item.itemTypeId) { if (onItemTypeText) onItemTypeText(iIdx); else up({ itemTypeId: '', groupId: '', partFabric: {}, sizeWise: {} }) } }} className={F} /></div>
        <div><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Party</label><Combo list={partyList} value={item.partyId} placeholder="Search party..." onSelect={(id) => (onSelectParty ? onSelectParty(iIdx, id) : up({ partyId: id }))} onAddNew={onAddNewParty ? ((name) => onAddNewParty(iIdx, name)) : undefined} onChange={(text) => { if (!text && item.partyId) { if (onPartyText) onPartyText(iIdx); else up({ partyId: '' }) } }} className={F} /></div>
        <div><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Group</label><Combo list={groupList} value={item.groupId} placeholder={groupPlaceholder} onSelect={(id) => (onSelectGroup ? onSelectGroup(iIdx, id) : up({ groupId: id, partFabric: {}, sizeWise: {} }))} onAddNew={onAddNewGroup ? ((name) => onAddNewGroup(iIdx, name)) : undefined} onChange={(text) => { if (!text && item.groupId) { if (onGroupText) onGroupText(iIdx); else up({ groupId: '', partFabric: {}, sizeWise: {} }) } }} className={F} /></div>
      </div>
      {item.groupId && (<>
        {parts.length > 0 && (<div className="mb-3"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Fabric per Part</label><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{parts.map((p) => (<div key={p.id}><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">{p.part_name}</label><Combo list={fabricList} value={item.partFabric[p.id] || ''} placeholder="Search fabric..." onSelect={(id) => (onSelectPartFabric ? onSelectPartFabric(iIdx, p.id, id) : up({ partFabric: { ...item.partFabric, [p.id]: id } }))} onAddNew={onAddNewPartFabric ? ((name) => onAddNewPartFabric(iIdx, p.id, name)) : undefined} onChange={(text) => { if (!text && item.partFabric[p.id]) { if (onPartFabricText) onPartFabricText(iIdx, p.id); else up({ partFabric: { ...item.partFabric, [p.id]: '' } }) } }} className={F} /></div>))}</div></div>)}
        {sizes.length > 0 && (<div className="mb-2"><label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Pieces by Size</label><div className="flex flex-wrap gap-1.5">{sizes.map((sz) => (<div key={sz.id} className="w-[104px]"><div className="text-[10px] text-text-soft text-center mb-0.5 truncate">{sz.name}</div><input type="number" min="0" className="w-full px-1 py-1 border border-border-strong rounded text-xs text-center" value={item.sizeWise[sz.id] || ''} onChange={(e) => up({ sizeWise: { ...item.sizeWise, [sz.id]: parseInt(e.target.value) || 0 } })} placeholder="0" /></div>))}</div><div className="text-xs font-bold mt-2">Row: <span className={rt > 0 ? 'text-green' : 'text-text-faint'}>{rt > 0 ? rt + ' pcs' : '—'}</span></div></div>)}
      </>)}
    </div>
  )
}
