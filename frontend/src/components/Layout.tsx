import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, CreditCard, BarChart2, Wallet, Target, Lightbulb, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/',                    label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/transactions',        label: 'Transakce',       icon: CreditCard },
  { to: '/analytics/spending',  label: 'Výdaje',          icon: BarChart2 },
  { to: '/budget',              label: 'Rozpočet',        icon: Wallet },
  { to: '/goals',               label: 'Cíle',            icon: Target },
  { to: '/recommendations',     label: 'Doporučení',      icon: Lightbulb },
  { to: '/analytics',           label: 'Analýzy',         icon: TrendingUp },
]

export const Layout = () => (
  <div className="flex min-h-screen bg-gray-50">
    {/* Sidebar */}
    <aside className="fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-100 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <h1 className="text-base font-bold text-gray-900">💰 Finance</h1>
        <p className="text-xs text-gray-400 mt-0.5">Jan Novák</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>

    {/* Main */}
    <main className="ml-56 flex-1 p-8">
      <Outlet />
    </main>
  </div>
)
