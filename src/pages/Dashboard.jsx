import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiCall } from '../hooks/useApiCall'
import { fetchOrders } from '../features/orders/api'
import { fetchJobWorkers } from '../features/masters/jobWorkersApi'
import { fetchItemTypes, fetchParties } from '../features/masters/api'
import { fetchIssueFabric } from '../features/issueFabric/api'
import { fetchReceiveMaterial } from '../features/receiveMaterial/api'
import { fetchLiveStock } from '../features/views/api'
import { fmtNum, fmtDate } from '../lib/format'
import { FiShoppingCart, FiUpload, FiDownload, FiPackage, FiClock, FiCheckCircle, FiPlus, FiArrowUp, FiArrowDown, FiEye, FiSearch } from 'react-icons/fi'

/**
 * Dashboard. Reference: function renderDashboard(c) in jobwork_v3.html.
 * Six stat cards (HTML order): Pending Orders, Completed Orders,
 * Fabric Issue Entries, Receive Entries, Total Billed, Stock lines with BOM pending.
 * Plus Quick Actions and Recent Orders (8 most recent, by date_created desc).
 */
export default function Dashboard() {
  const navigate = useNavigate()
  const { data: orders } = useApiCall(fetchOrders, [], 'orders')
  const { data: jobWorkers } = useApiCall(fetchJobWorkers, [], 'jobWorkers')
  const { data: itemTypes } = useApiCall(fetchItemTypes, [], 'itemTypes')
  const { data: issueFabric } = useApiCall(fetchIssueFabric, [], 'issueFabric')
  const { data: receiveMaterial } = useApiCall(fetchReceiveMaterial, [], 'receiveMaterial')
  const { data: parties } = useApiCall(fetchParties, [], 'parties')
  const { data: stockRows } = useApiCall(fetchLiveStock)

  const pendingCount = orders?.filter((o) => o.status === 'Pending').length || 0
  const completedCount = orders?.filter((o) => o.status === 'Completed').length || 0
  const issueCount = issueFabric?.length || 0
  const receiveCount = receiveMaterial?.length || 0
  const bomPendingCount = stockRows?.filter((s) => s.bom_pending).length || 0

  const totalBilled = useMemo(() => {
    if (!receiveMaterial || !jobWorkers) return 0
    let total = 0
    receiveMaterial.forEach((entry) => {
      ;(entry.receive_items || []).forEach((item) => {
        const group = jobWorkers.find((j) => j.id === entry.job_worker_id)?.groups?.find((g) => g.id === item.group_id)
        if (!group) return
        const pieces = (item.receive_item_sizes || []).reduce((sum, sw) => sum + (sw.pieces || 0), 0)
        total += pieces * (group.piece_rate || 0)
      })
    })
    return total
  }, [receiveMaterial, jobWorkers])

  const [orderSearch, setOrderSearch] = useState('')

  const recentOrders = useMemo(() => {
    if (!orders) return []
    const sorted = [...orders].sort((a, b) => new Date(b.date_created) - new Date(a.date_created))
    const q = orderSearch.trim().toLowerCase()
    if (!q) return sorted.slice(0, 8)
    const pN = (id) => parties?.find((p) => p.id === id)?.name || ''
    const iN = (id) => itemTypes?.find((t) => t.id === id)?.name || ''
    const jN = (id) => jobWorkers?.find((j) => j.id === id)?.name || ''
    return sorted
      .filter((o) =>
        [o.date_created, o.status, pN(o.party_id), iN(o.item_type_id), jN(o.job_worker_id)].some((v) =>
          (v || '').toLowerCase().includes(q)
        )
      )
      .slice(0, 8)
  }, [orders, orderSearch, parties, itemTypes, jobWorkers])

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={<FiClock size={18} className="text-amber mb-2" />} value={pendingCount} label="Pending Orders" />
        <StatCard icon={<FiCheckCircle size={18} className="text-green mb-2" />} value={completedCount} label="Completed Orders" />
        <StatCard icon={<FiUpload size={18} className="text-accent mb-2" />} value={issueCount} label="Fabric Issue Entries" />
        <StatCard icon={<FiDownload size={18} className="text-accent mb-2" />} value={receiveCount} label="Receive Entries" />
        <StatCard icon={<FiShoppingCart size={18} className="text-green mb-2" />} value={`₹${fmtNum(totalBilled)}`} label="Total Billed" />
        <StatCard icon={<FiPackage size={18} className="text-red mb-2" />} value={bomPendingCount} label="Stock lines with BOM pending" />
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mb-6">
        <h2 className="text-base font-bold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors text-sm font-semibold shadow-sm" onClick={() => navigate('/orders')}>
            <FiPlus size={18} />
            <span>Create Order</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border-2 border-border hover:border-accent hover:text-accent transition-colors text-sm font-semibold" onClick={() => navigate('/issue-fabric')}>
            <FiUpload size={18} className="text-accent" />
            <span>Issue Fabric</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border-2 border-border hover:border-accent hover:text-accent transition-colors text-sm font-semibold" onClick={() => navigate('/receive-material')}>
            <FiArrowDown size={18} className="text-accent" />
            <span>Receive Material</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border-2 border-border hover:border-accent hover:text-accent transition-colors text-sm font-semibold" onClick={() => navigate('/live-stock')}>
            <FiEye size={18} className="text-accent" />
            <span>View Live Stock</span>
          </button>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-base font-bold">Recent Orders</h2>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint flex"><FiSearch size={14} /></span>
            <input
              className="w-52 max-w-full pl-8 pr-3 py-1.5 border border-border-strong rounded-md text-sm bg-white"
              type="text"
              placeholder="Search orders..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>
        </div>
        {!recentOrders.length ? (
          <div className="empty-state"><div className="msg">{orderSearch.trim() ? `No orders match "${orderSearch.trim()}".` : 'No orders yet. Create your first order to get started.'}</div></div>
        ) : (
          <div className="table-scroll"><table className="w-full border-collapse text-[13.5px]">
            <thead><tr className="text-left text-text-soft text-xs uppercase font-bold bg-[#f7f8fa] border-b border-border"><th className="p-2.5">Date</th><th className="p-2.5">Party</th><th className="p-2.5">Item Type</th><th className="p-2.5">Job Worker</th><th className="p-2.5">Status</th></tr></thead>
            <tbody>{recentOrders.map((o) => {
              const party = parties?.find((p) => p.id === o.party_id)
              const it = itemTypes?.find((t) => t.id === o.item_type_id)
              const jw = jobWorkers?.find((j) => j.id === o.job_worker_id)
              return (<tr key={o.id} className="border-b border-[#ecedf1] hover:bg-[#fafbfc]"><td className="p-2.5">{fmtDate(o.date_created)}</td><td className="p-2.5">{party ? party.name : '—'}</td><td className="p-2.5">{it ? it.name : '—'}</td><td className="p-2.5">{jw ? jw.name : '—'}</td><td className="p-2.5"><span className={'badge ' + (o.status === 'Pending' ? 'badge-pending' : 'badge-completed')}>{o.status}</span></td></tr>)
            })}</tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      {icon}
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-text-soft mt-0.5">{label}</div>
    </div>
  )
}
