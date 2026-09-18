/**
 * Topbar — shows current screen title, hamburger toggle (mobile), and user info.
 */
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiMenu, FiLogOut } from 'react-icons/fi'
import GlobalSearch from '../GlobalSearch'

const TITLES = {
  '/': 'Dashboard',
  '/orders': 'Orders',
  '/issue-fabric': 'Issue Fabric',
  '/receive-material': 'Receive Material',
  '/live-stock': 'Live Stock',
  '/fabric-ledger': 'Fabric Ledger',
  '/orders-list': 'Orders List',
  '/group-wise': 'Group-wise Data',
  '/history': 'History',
  '/billing': 'Billing',
  '/masters': 'Masters',
  '/payments': 'Payments',
}

export default function Topbar({ onMenuClick }) {
  const location = useLocation()
  const { profile, logout } = useAuth()
  const title = TITLES[location.pathname] || 'Job Work Tracker'

  return (
    <header className="h-14 flex-none bg-panel border-b border-border flex items-center px-4 md:px-6 justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          className="lg:hidden bg-transparent border-none text-lg cursor-pointer p-1.5 text-text"
          onClick={onMenuClick}
        >
          <FiMenu />
        </button>
        <h1 className="text-base font-bold m-0 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-none">
        <GlobalSearch />
        <span className="text-sm text-text-soft hidden sm:inline">
          {profile?.full_name || profile?.email}
        </span>
        <button
          className="btn btn-sm btn-ghost"
          onClick={logout}
          title="Sign out"
        >
          <FiLogOut size={16} />
        </button>
      </div>
    </header>
  )
}
