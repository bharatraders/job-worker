import { useState } from 'react'
import { useApiCall } from '../hooks/useApiCall'
import { fetchGroupBilling } from '../features/views/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fmtNum } from '../lib/format'
import { FiLock } from 'react-icons/fi'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function Billing() {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [pinError, setPinError] = useState('')
  const [checking, setChecking] = useState(false)

  const { data: billing, loading, error } = useApiCall(fetchGroupBilling, [unlocked])
  const { data: jobWorkers } = useApiCall(fetchJobWorkers)

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

  const totalOwed = billing?.reduce((s, r) => s + Number(r.amount_owed || 0), 0) || 0
  const totalPaid = billing?.reduce((s, r) => s + Number(r.total_paid || 0), 0) || 0
  const totalDue = billing?.reduce((s, r) => s + Number(r.balance_due || 0), 0) || 0

  return (
    <div>
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
      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-3">Group-wise Billing</h2>
        {!billing?.length ? (
          <div className="empty-state"><div className="msg">No billing data yet.</div></div>
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
                {billing.map((r, i) => (
                  <tr key={i} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
                    <td className="p-2.5">{jwName(r.job_worker_id)}</td>
                    <td className="p-2.5">{r.group_id}</td>
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
