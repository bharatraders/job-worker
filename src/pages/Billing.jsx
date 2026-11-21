import { useState, useEffect } from 'react'
import { useApiCall } from '../hooks/useApiCall'
import { fetchGroupBilling } from '../features/views/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fetchItemTypes } from '../features/masters/api'
import { fmtNum } from '../lib/format'
import { FiLock } from 'react-icons/fi'
import SearchSelect from '../components/ui/SearchSelect'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const UNLOCK_KEY = 'jwt_billing_unlocked'
const F = 'w-full px-3 py-2 border border-border-strong rounded-md text-sm'

export default function Billing() {
  const [pin, setPin] = useState('')
  // Stay unlocked across page switches until the user locks or reloads.
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(UNLOCK_KEY) === '1' } catch { return false }
  })
  const [pinError, setPinError] = useState('')
  const [checking, setChecking] = useState(false)
  // Minimal display-only filters (no change to data source / views).
  const [fJobWorkerId, setFJobWorkerId] = useState('')
  const [fItemTypeId, setFItemTypeId] = useState('')
  const [fGroupId, setFGroupId] = useState('')

  // Original data source — untouched.
  const { data: billing, loading, error } = useApiCall(fetchGroupBilling, [unlocked])
  const { data: jobWorkers } = useApiCall(fetchJobWorkers)
  const { data: itemTypes } = useApiCall(fetchItemTypes)

  // Persist unlock for this tab session only (cleared on tab close).
  useEffect(() => {
    try {
      if (unlocked) sessionStorage.setItem(UNLOCK_KEY, '1')
      else sessionStorage.removeItem(UNLOCK_KEY)
    } catch {}
  }, [unlocked])

  function lockBilling() {
    setUnlocked(false)
    setPin('')
    setPinError('')
    try { sessionStorage.removeItem(UNLOCK_KEY) } catch {}
  }

  async function handlePinSubmit(e) {
    e.preventDefault()
    if (!pin.trim()) return
    setChecking(true)
    setPinError('')
    try {
      const res = await fetch(`${FUNCTIONS_URL}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ pin: pin.trim() }),
      })
      const data = await res.json()
      if (data.ok) { setUnlocked(true) } else { setPinError('Incorrect PIN') }
    } catch (err) {
      setPinError('Could not verify PIN. Check connection.')
    } finally { setChecking(false) }
  }

  function jwName(id) { return jobWorkers?.find((j) => j.id === id)?.name || '—' }
  function itemName(id) { return itemTypes?.find((x) => x.id === id)?.name || '—' }
  function groupInfo(jwId, groupId) {
    const jw = jobWorkers?.find((j) => j.id === jwId)
    const group = jw?.groups?.find((g) => g.id === groupId)
    return {
      itemTypeId: group?.item_type_id || '',
      itemTypeName: itemName(group?.item_type_id || ''),
      groupName: group?.group_name || '—',
    }
  }

  const itemTypeOptions = []
  ;(billing || []).forEach((row) => {
    const { itemTypeId, itemTypeName } = groupInfo(row.job_worker_id, row.group_id)
    if (!itemTypeId || !itemTypeName || itemTypeName === '—') return
    if (fJobWorkerId && fJobWorkerId !== row.job_worker_id) return
    if (!itemTypeOptions.some((option) => option.id === itemTypeId)) {
      itemTypeOptions.push({ id: itemTypeId, name: itemTypeName })
    }
  })

  const groupOptions = []
  ;(billing || []).forEach((row) => {
    const { itemTypeId, itemTypeName, groupName } = groupInfo(row.job_worker_id, row.group_id)
    if (!itemTypeId || !groupName || groupName === '—') return
    if (fJobWorkerId && fJobWorkerId !== row.job_worker_id) return
    if (fItemTypeId && fItemTypeId !== itemTypeId) return
    const key = `${row.job_worker_id}|${row.group_id}`
    if (!groupOptions.some((option) => option.key === key)) {
      groupOptions.push({
        key,
        id: row.group_id,
        name: `${jwName(row.job_worker_id)} — ${itemTypeName} — ${groupName}`,
      })
    }
  })

  const filteredBillingRows = (billing || []).filter((row) => {
    const { itemTypeId } = groupInfo(row.job_worker_id, row.group_id)
    if (fJobWorkerId && row.job_worker_id !== fJobWorkerId) return false
    if (fItemTypeId && itemTypeId !== fItemTypeId) return false
    if (fGroupId && row.group_id !== fGroupId) return false
    return true
  })

  // Payments are recorded against the job worker, not a specific group.
  // Aggregate the matching raw group rows to a jobworker-level billing summary so the
  // paid and balance figures are consistent with the actual accounting model.
  const workerRows = filteredBillingRows.reduce((acc, row) => {
    const key = row.job_worker_id
    if (!acc[key]) {
      acc[key] = {
        job_worker_id: key,
        total_pieces: 0,
        amount_owed: 0,
        total_paid: Number(row.total_paid || 0),
      }
    }
    acc[key].total_pieces += Number(row.total_pieces || 0)
    acc[key].amount_owed += Number(row.amount_owed || 0)
    acc[key].total_paid = Number(acc[key].total_paid || 0)
    return acc
  }, {})

  const workerBilling = Object.values(workerRows).map((row) => ({
    ...row,
    balance_due: Number(row.amount_owed || 0) - Number(row.total_paid || 0),
  })).sort((a, b) => (jwName(a.job_worker_id) || '').localeCompare(jwName(b.job_worker_id) || ''))

  const filtered = workerBilling

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-panel border border-border rounded-xl p-8 w-[320px] max-w-full">
          <div className="text-center mb-6">
            <FiLock size={28} className="text-accent mx-auto mb-2" />
            <h2 className="text-lg font-bold">Billing Access</h2>
            <p className="text-sm text-text-soft mt-1">Enter PIN to view billing</p>
          </div>
          <form onSubmit={handlePinSubmit}>
            <input type="password" maxLength={6} className="w-full px-3 py-2.5 border border-border-strong rounded-md text-sm text-center tracking-widest text-lg mb-3 focus:outline-none focus:border-accent" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" autoFocus />
            {pinError && <div className="text-red text-sm text-center mb-3">{pinError}</div>}
            <button type="submit" disabled={checking} className="btn btn-primary w-full">{checking ? 'Checking...' : 'Unlock'}</button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  const totalOwed = filtered?.reduce((s, r) => s + Number(r.amount_owed || 0), 0) || 0
  const totalPaid = filtered?.reduce((s, r) => s + Number(r.total_paid || 0), 0) || 0
  const totalDue = filtered?.reduce((s, r) => s + Number(r.balance_due || 0), 0) || 0

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button className="btn btn-sm" onClick={lockBilling}>🔒 Lock Billing</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-xs text-text-soft uppercase font-bold">Total Billed</div>
          <div className="text-2xl font-extrabold mt-1">₹{fmtNum(totalOwed)}</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-xs text-text-soft uppercase font-bold">Total Paid</div>
          <div className="text-2xl font-extrabold mt-1 text-green">₹{fmtNum(totalPaid)}</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-xs text-text-soft uppercase font-bold">Balance Due</div>
          <div className={'text-2xl font-extrabold mt-1 ' + (totalDue > 0 ? 'text-red' : 'text-green')}>₹{fmtNum(totalDue)}</div>
        </div>
      </div>
      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <h2 className="text-base font-bold mb-1">Filters</h2>
        <div className="flex gap-3 mt-3 flex-wrap items-end">
          <div className="w-48">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label>
            <SearchSelect className={F} list={jobWorkers?.map((jw) => ({ id: jw.id, name: jw.name })) || []} value={fJobWorkerId} placeholder="All job workers" onSelect={(id) => { setFJobWorkerId(id || ''); setFItemTypeId(''); setFGroupId('') }} />
          </div>
          <div className="w-52">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Item Type</label>
            <SearchSelect className={F} list={itemTypeOptions} value={fItemTypeId} placeholder="All item types" onSelect={(id) => { setFItemTypeId(id || ''); setFGroupId('') }} />
          </div>
          <div className="w-64">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Group</label>
            <SearchSelect className={F} list={groupOptions} value={fGroupId} placeholder="All groups" onSelect={(id) => setFGroupId(id || '')} />
          </div>
          <button className="btn" onClick={() => { setFJobWorkerId(''); setFItemTypeId(''); setFGroupId('') }}>Clear filters</button>
        </div>
      </div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-3">Job Worker Billing <span className="text-xs font-normal text-text-soft">({filtered?.length || 0})</span></h2>
        {!filtered?.length ? (
          <div className="empty-state"><div className="msg">No billing data matches these filters.</div></div>
        ) : (
          <div className="table-scroll">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border">
                  <th className="p-2.5">Job Worker</th>
                  <th className="p-2.5 text-right">Pieces</th>
                  <th className="p-2.5 text-right">Billed Amount</th>
                  <th className="p-2.5 text-right">Paid</th>
                  <th className="p-2.5 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
                    <td className="p-2.5">{jwName(r.job_worker_id)}</td>
                    <td className="p-2.5 text-right font-mono">{fmtNum(r.total_pieces, 0)}</td>
                    <td className="p-2.5 text-right font-mono">{fmtNum(r.amount_owed)}</td>
                    <td className="p-2.5 text-right font-mono text-green">{fmtNum(r.total_paid)}</td>
                    <td className={'p-2.5 text-right font-mono font-bold ' + (r.balance_due > 0 ? 'text-red' : 'text-green')}>{fmtNum(r.balance_due)}</td>
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
