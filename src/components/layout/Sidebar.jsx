/**
 * Sidebar — navigation menu. Collapses on mobile via the `open` prop.
 * Each nav item routes to a screen. Icons from react-icons.
 */
import { NavLink } from 'react-router-dom'
import {
  FiLayout,
  FiShoppingCart,
  FiUpload,
  FiDownload,
  FiUsers,
  FiDollarSign,
  FiClock,
  FiPackage,
  FiBookOpen,
  FiLock,
  FiX,
  FiGrid,
} from 'react-icons/fi'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: FiLayout },
  { to: '/orders', label: 'Orders', icon: FiShoppingCart },
  { to: '/issue-fabric', label: 'Issue Fabric', icon: FiUpload },
  { to: '/receive-material', label: 'Receive Material', icon: FiDownload },
  { to: '/live-stock', label: 'Live Stock', icon: FiPackage },
  { to: '/fabric-ledger', label: 'Fabric Ledger', icon: FiBookOpen },
  { to: '/group-wise', label: 'Group-wise Data', icon: FiGrid },
  { to: '/history', label: 'History', icon: FiClock },
  { to: '/billing', label: 'Billing', icon: FiLock },
  { to: '/masters', label: 'Masters', icon: FiUsers },
  { to: '/payments', label: 'Payments', icon: FiDollarSign },
]

export default function Sidebar({ open, onClose }) {
  return (
    <aside
      className={`
        fixed lg:sticky lg:top-0 inset-y-0 left-0 z-[400]
        w-52 bg-sidebar text-gray-300 flex flex-col lg:h-screen
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="text-white font-bold text-base">Job Work Tracker</div>
        <div className="text-[11px] text-gray-500 mt-0.5">Garment Manufacturing ERP</div>
      </div>

      {/* Mobile close button */}
      <button
        className="lg:hidden absolute top-3 right-3 text-gray-400 hover:text-white"
        onClick={onClose}
      >
        <FiX size={20} />
      </button>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-[13.5px] border-l-3 transition-colors ${
                isActive
                  ? 'bg-white/10 border-accent text-white font-semibold'
                  : 'border-transparent hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={16} className="opacity-85 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
