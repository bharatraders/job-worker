import { useState, useEffect } from 'react'
import { useApiCall } from '../hooks/useApiCall'
import { fetchGroupBilling } from '../features/views/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fmtNum } from '../lib/format'
import { FiLock } from 'react-icons/fi'

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
  const [fGroupId, setFGroupId] = useState('')

  // Original data source — untouched.
  const { data: billing, loading, error } = useApiCall(fetchGroupBilling, [unlocked])
  const { data: jobWorkers } = useApiCall(fetchJobWorkers)

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

  // Minimal display-only filters over the original view rows. Group names
  // resolve from the already-fetched jobWorkers tree; rows whose group was
  // deleted from masters show '—' but are NOT hidden (full data preserved).
  const filtered = (billing || []).filter((r) =>
    (!fJobWorkerId || r.job_worker_id === fJobWorkerId) &&
    (!fGroupId || r.group_id === fGroupId)
  )
  const groupOptions = []
  ;(jobWorkers || []).forEach((jw) => {
    if (fJobWorkerId && fJobWorkerId !== jw.id) return
    ;(jw.groups || []).forEach((g) => groupOptions.push({ id: g.id, name: jw.name + ' — ' + g.group_name }))
  })
  function groupLabel(jwId, groupId) {
    const g = jobWorkers?.find((j) => j.id === jwId)?.groups?.find((x) => x.id === groupId)
    return g ? g.group_name : '—'
  }

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
            <select className={F} value={fJobWorkerId} onChange={(e) => { setFJobWorkerId(e.target.value); setFGroupId('') }}>
              <option value="">All job workers</option>
              {jobWorkers?.map((jw) => <option key={jw.id} value={jw.id}>{jw.name}</option>)}
            </select>
          </div>
          <div className="w-56">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Group</label>
            <select className={F} value={fGroupId} onChange={(e) => setFGroupId(e.target.value)}>
              <option value="">All groups</option>
              {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <button className="btn" onClick={() => { setFJobWorkerId(''); setFGroupId('') }}>Clear filters</button>
        </div>
      </div>
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-3">Group-wise Billing <span className="text-xs font-normal text-text-soft">({filtered?.length || 0})</span></h2>
        {!filtered?.length ? (
          <div className="empty-state"><div className="msg">No billing data matches these filters.</div></div>
        ) : (
          <div className="table-scroll">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border">
                  <th className="p-2.5">Job Worker</th>
                  <th className="p-2.5">Group</th>
                  <th className="p-2.5 text-right">Pieces</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">Amount</th>
                  <th className="p-2.5 text-right">Paid</th>
                  <th className="p-2.5 text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
                    <td className="p-2.5">{jwName(r.job_worker_id)}</td>
                    <td className="p-2.5">{groupLabel(r.job_worker_id, r.group_id)}</td>
                    <td className="p-2.5 text-right font-mono">{fmtNum(r.total_pieces, 0)}</td>
                    <td className="p-2.5 text-right font-mono">{fmtNum(r.piece_rate)}</td>
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
