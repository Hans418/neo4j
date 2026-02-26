import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatCZK, formatPercent } from '@/lib/utils'
import { StatCard, Card, CardHeader, CardTitle, CardContent, LoadingState, ErrorState, Progress, Badge } from '@/components/ui'
import { TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const currentMonth = new Date().toISOString().slice(0, 7)

export const Dashboard = () => {
  const cashflow = useApi(() => api.analytics.cashflow(currentMonth))
  const goals    = useApi(() => api.goals.list())
  const accounts = useApi(() => api.accounts.list())

  if (cashflow.loading) return <LoadingState />
  if (cashflow.error)   return <ErrorState message={cashflow.error} onRetry={cashflow.refetch} />

  const cf = cashflow.data!
  const totalBalance = accounts.data?.reduce((s, a) => s + a.balance, 0) ?? 0

  const barData = {
    labels: cf.expenses.slice(0, 6).map(e => e.category),
    datasets: [{
      label: 'Výdaje (Kč)',
      data: cf.expenses.slice(0, 6).map(e => e.amount),
      backgroundColor: ['#3b82f6','#f97316','#8b5cf6','#22c55e','#ec4899','#eab308'],
      borderRadius: 6,
    }]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">{currentMonth}</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Celkový zůstatek" value={formatCZK(totalBalance)}
          icon={<Wallet size={18} />} bg="bg-blue-50" color="text-blue-600"
        />
        <StatCard
          title="Příjmy tento měsíc" value={formatCZK(cf.totalIncome)}
          icon={<TrendingUp size={18} />} bg="bg-green-50" color="text-green-600"
        />
        <StatCard
          title="Výdaje tento měsíc" value={formatCZK(cf.totalExpenses)}
          icon={<TrendingDown size={18} />} bg="bg-red-50" color="text-red-500"
        />
        <StatCard
          title="Míra úspor" value={formatPercent(cf.savingsRate * 100)}
          sub={`Čistý cashflow: ${formatCZK(cf.netCashflow)}`}
          icon={<Target size={18} />} bg="bg-purple-50" color="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Bar chart výdajů */}
        <Card>
          <CardHeader><CardTitle>Výdaje podle kategorie</CardTitle></CardHeader>
          <CardContent>
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v) => `${v} Kč` } } } }} />
          </CardContent>
        </Card>

        {/* Cíle */}
        <Card>
          <CardHeader><CardTitle>Finanční cíle</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {goals.loading
              ? <LoadingState text="Načítám cíle..." />
              : goals.data?.map(g => (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{g.name}</span>
                    <span className="text-gray-400">{formatCZK(g.currentAmount)} / {formatCZK(g.targetAmount)}</span>
                  </div>
                  <Progress
                    value={g.progressPercent ?? 0}
                    color={g.progressPercent && g.progressPercent >= 80 ? 'bg-green-500' : 'bg-blue-500'}
                  />
                  <p className="text-xs text-gray-400 mt-1">{g.progressPercent ?? 0} % • deadline: {g.deadline}</p>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>

      {/* Příjmy */}
      <Card>
        <CardHeader><CardTitle>Příjmy tento měsíc</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {cf.income.map((inc, i) => (
              <div key={i} className="flex justify-between py-3 text-sm">
                <span className="text-gray-700">{inc.source}</span>
                <span className="font-semibold text-green-600">+{formatCZK(inc.amount)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
