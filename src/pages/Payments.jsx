/**
 * Payments page — record and manage payments to job workers.
 * Simple CRUD on the payments table.
 */
import { useState } from 'react'
import { useApiCall, useMutation } from '../hooks/useApiCall'
import { fetchPayments, upsertPayment, deletePayment } from '../features/payments/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { showToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmModal'
import { fmtNum, fmtDate, todayStr } from '../lib/format'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
export default function Payments() {
  const { data: payments, loading, error, refetch } = useApiCall(fetchPayments, [], 'payments')
  const { data: jobWorkers } = useApiCall(fetchJobWorkers, [], 'jobWorkers')

  const { mutate: savePayment, loading: saving } = useMutation(upsertPayment)
  const { mutate: removePayment } = useMutation(deletePayment)
  const { confirm } = useConfirm()

  const [form, setForm] = useState({ jobWorkerId: '', amount: '', date: todayStr(), notes: '' })

  function jwName(id) { return jobWorkers?.find((j) => j.id === id)?.name || '—' }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.jobWorkerId) return showToast('Select a job worker')
    if (!form.amount || Number(form.amount) <= 0) return showToast('Enter a valid amount')
    try {
      await savePayment({ jobWorkerId: form.jobWorkerId, amount: Number(form.amount), date: form.date, notes: form.notes })
      showToast(`Payment of ₹${fmtNum(form.amount)} recorded`)
      setForm({ jobWorkerId: '', amount: '', date: todayStr(), notes: '' })
      refetch()
    } catch (err) { showToast(`Failed: ${err.message}`) }
  }

  async function handleDelete(id) {
    const ok = await confirm({ title: 'Delete Payment', message: 'This payment record will be permanently deleted.', type: 'danger', confirmText: 'Delete', }); if (!ok) return
    try { await removePayment(id); showToast('Deleted'); refetch() }
    catch (err) { showToast(`Failed: ${err.message}`) }
  }

  if (loading) return <div className="text-text-soft p-8">Loading...</div>
  if (error) return <div className="text-red p-8">Error: {error}</div>

  return (
    <div>
      <div className="bg-panel border border-border rounded-lg p-4 mb-4">
        <h2 className="text-base font-bold mb-3">Record Payment</h2>
        <form onSubmit={handleAdd}>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="w-48">
              <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Job Worker</label>
              <select className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={form.jobWorkerId} onChange={(e) => setForm({ ...form, jobWorkerId: e.target.value })}>
                <option value="">Select...</option>
                {jobWorkers?.map((jw) => <option key={jw.id} value={jw.id}>{jw.name}</option>)}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Amount (₹)</label>
              <input type="number" min="0" className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </div>
            <div className="w-36">
              <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Date</label>
              <input type="date" className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase">Notes</label>
              <input className="w-full px-3 py-2 border border-border-strong rounded-md text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </div>
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-green text-white shadow-sm hover:bg-green-600 transition-colors" disabled={saving}><FiPlus size={16} /> Record</button>
          </div>
        </form>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4">
        <h2 className="text-base font-bold mb-3">Payment History ({payments?.length || 0})</h2>
        {!payments?.length ? (
          <div className="empty-state"><div className="msg">No payments recorded yet.</div></div>
        ) : (
          <div className="table-scroll">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border">
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Job Worker</th>
                  <th className="p-2.5 text-right">Amount</th>
                  <th className="p-2.5">Notes</th>
                  <th className="p-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]">
                    <td className="p-2.5">{fmtDate(p.date)}</td>
                    <td className="p-2.5">{jwName(p.job_worker_id)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-green">₹{fmtNum(p.amount)}</td>
                    <td className="p-2.5 text-text-soft">{p.notes || '—'}</td>
                    <td className="p-2.5 text-right">
                      <button className="text-text-soft hover:text-red p-1.5" onClick={() => handleDelete(p.id)}><FiTrash2 size={14} /></button>
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
