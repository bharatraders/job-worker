/**
 * App — top-level router and auth guard.
 * Unauthenticated users see the login screen.
 * Authenticated users see the full app shell (sidebar + topbar + page content).
 *
 * Route guards reference role from context (not just "is logged in"),
 * so future worker screens slot in without restructuring.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppShell from './components/layout/AppShell'
import ToastHost from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmModal'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import IssueFabric from './pages/IssueFabric'
import ReceiveMaterial from './pages/ReceiveMaterial'
import ReceiveMaterialNew from './pages/ReceiveMaterialNew'
import Masters from './pages/masters/Masters'
import JobWorkerEdit from './pages/masters/JobWorkerEdit'
import Payments from './pages/Payments'
import History from './pages/History'
import LiveStock from './pages/LiveStock'
import Billing from './pages/Billing'
import FabricLedger from './pages/FabricLedger'
import GroupWiseData from './pages/GroupWiseData'

export default function App() {
  const { isAuthenticated, loading, isActive } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-text-soft">
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <>
      <Login />
      <ToastHost />
    </>
  }

  if (!isActive) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg font-bold text-red">Account deactivated</p>
          <p className="text-sm text-text-soft mt-2">Contact your administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <ConfirmProvider>
      <>
        <ToastHost />
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders-list" element={<Navigate to="/orders" replace />} />
            <Route path="/issue-fabric" element={<IssueFabric />} />
            <Route path="/receive-material" element={<ReceiveMaterial />} />
            <Route path="/receive-material/new" element={<ReceiveMaterialNew />} />
            <Route path="/masters" element={<Masters />} />
            <Route path="/masters/job-workers/:id" element={<JobWorkerEdit />} />
            <Route path="/masters/*" element={<Navigate to="/masters" replace />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/history" element={<History />} />
            <Route path="/live-stock" element={<LiveStock />} />
            <Route path="/fabric-ledger" element={<FabricLedger />} />
            <Route path="/group-wise" element={<GroupWiseData />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </>
    </ConfirmProvider>
  )
}

