import { useState } from 'react'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatCZK, formatPercent } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent, LoadingState, ErrorState } from '@/components/ui'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const currentMonth = new Date().toISOString().slice(0, 7)

export const SpendingAnalytics = () => {
  const [month, setMonth] = useState(currentMonth)

  const breakdown = useApi(() => api.analytics.cashflowBreakdown(month), [month])
  const byCategory = useApi(() => api.analytics.spendingByCategory(3))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analýza výdajů</h1>
        <input
          type="month" value={month}
          onChange={e => setMonth(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {breakdown.loading ? <LoadingState /> : breakdown.error ? <ErrorState message={breakdown.error} /> : (() => {
        const bd = breakdown.data!
        const donutData = {
          labels: bd.categories.map(c => c.name),
          datasets: [{ data: bd.categories.map(c => c.amount), backgroundColor: bd.categories.map(c => c.color), borderWidth: 2, borderColor: '#fff' }]
        }
        return (
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rozložení výdajů</CardTitle>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatCZK(bd.totalExpenses)}</p>
              </CardHeader>
              <CardContent>
                <Doughnut data={donutData} options={{ plugins: { legend: { position: 'right' } }, cutout: '65%' }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Kategorie – detail</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {bd.categories.map(cat => (
                  <div key={cat.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-gray-700">{cat.name}</span>
                      </span>
                      <span className="text-gray-500">{formatCZK(cat.amount)} <span className="text-gray-400">({formatPercent(cat.percentage)})</span></span>
                    </div>
                    {cat.subcategories?.length > 0 && (
                      <div className="ml-5 space-y-0.5">
                        {cat.subcategories.map(sub => (
                          <div key={sub.id} className="flex justify-between text-xs text-gray-400">
                            <span>{sub.name}</span>
                            <span>{formatCZK(sub.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* Trend posledních 3 měsíců */}
      <Card>
        <CardHeader><CardTitle>Trend výdajů (tento vs. minulý měsíc)</CardTitle></CardHeader>
        <CardContent>
          {byCategory.loading ? <LoadingState /> : byCategory.data && (
            <Bar
              data={{
                labels: byCategory.data.map(c => c.categoryName),
                datasets: [
                  { label: 'Tento měsíc', data: byCategory.data.map(c => c.thisMonth), backgroundColor: '#3b82f6', borderRadius: 4 },
                  { label: 'Minulý měsíc', data: byCategory.data.map(c => c.lastMonth), backgroundColor: '#e2e8f0', borderRadius: 4 },
                ]
              }}
              options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { ticks: { callback: v => `${v} Kč` } } } }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
