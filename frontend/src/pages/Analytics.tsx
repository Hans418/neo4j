import { useState } from 'react'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatCZK, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, LoadingState, ErrorState, Badge } from '@/components/ui'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler } from 'chart.js'
import { AlertTriangle } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler)

const currentYear = new Date().getFullYear()

export const Analytics = () => {
  const [tab, setTab] = useState<'year' | 'anomalies' | 'patterns'>('year')

  const yearReview  = useApi(() => api.analytics.yearInReview(currentYear))
  const anomalies   = useApi(() => api.analytics.anomalies(0.8))
  const patterns    = useApi(() => api.analytics.spendingPatterns(6))

  const tabs = [
    { key: 'year',      label: 'Roční přehled' },
    { key: 'anomalies', label: `Anomálie${anomalies.data?.anomalies.length ? ` (${anomalies.data.anomalies.length})` : ''}` },
    { key: 'patterns',  label: 'Vzory výdajů' },
  ] as const

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analýzy</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Roční přehled */}
      {tab === 'year' && (yearReview.loading ? <LoadingState /> : yearReview.error ? <ErrorState message={yearReview.error} /> : (() => {
        const yr = yearReview.data!
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { label: 'Celkové příjmy',  value: formatCZK(yr.totalIncome),   color: 'text-green-600' },
                { label: 'Celkové výdaje',  value: formatCZK(yr.totalExpenses), color: 'text-red-500' },
                { label: 'Čisté úspory',    value: formatCZK(yr.netSavings),    color: 'text-blue-600' },
                { label: 'Míra úspor',      value: `${yr.savingsRate.toFixed(1)} %`, color: 'text-purple-600' },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="pt-5">
                    <p className="text-sm text-gray-400">{s.label}</p>
                    <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle>Příjmy vs výdaje po měsících</CardTitle></CardHeader>
              <CardContent>
                <Bar
                  data={{
                    labels: yr.monthlyBreakdown.map(m => `${m.month}/${yr.year}`),
                    datasets: [
                      { label: 'Příjmy', data: yr.monthlyBreakdown.map(m => m.income),   backgroundColor: '#22c55e', borderRadius: 4 },
                      { label: 'Výdaje', data: yr.monthlyBreakdown.map(m => m.expenses), backgroundColor: '#f87171', borderRadius: 4 },
                    ]
                  }}
                  options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { ticks: { callback: v => `${v} Kč` } } } }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top 5 kategorií výdajů za rok</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {yr.topExpenseCategories.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{i + 1}. {c.category}</span>
                    <span className="font-semibold text-red-500">-{formatCZK(c.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )
      })())}

      {/* Anomálie */}
      {tab === 'anomalies' && (anomalies.loading ? <LoadingState /> : anomalies.error ? <ErrorState message={anomalies.error} /> : (
        <div className="space-y-4">
          {anomalies.data?.anomalies.length === 0 && (
            <p className="text-center text-gray-400 py-10">Žádné podezřelé transakce nebyly nalezeny ✓</p>
          )}
          {anomalies.data?.anomalies.map((a, i) => (
            <Card key={i} className="border-red-200 bg-red-50">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-gray-900">{a.transaction.description}</span>
                      <span className="font-bold text-red-600">-{formatCZK(a.transaction.amount)}</span>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Badge variant="danger">Skóre: {Math.round(a.anomalyScore * 100)} %</Badge>
                      {a.categoryName && <Badge variant="muted">{a.categoryName}</Badge>}
                      <span className="text-xs text-gray-400">{formatDate(a.transaction.date)}</span>
                    </div>
                    <ul className="text-sm text-red-700 space-y-0.5">
                      {a.reasons.map((r, j) => <li key={j}>• {r}</li>)}
                    </ul>
                    <p className="text-sm font-medium text-red-800 mt-2">{a.recommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {/* Vzory výdajů */}
      {tab === 'patterns' && (patterns.loading ? <LoadingState /> : patterns.error ? <ErrorState message={patterns.error} /> : (() => {
        const cats = [...new Set(patterns.data?.patterns.map(p => p.category))]
        const months = [...new Set(patterns.data?.patterns.map(p => p.month))].sort()
        const colors = ['#3b82f6','#f97316','#8b5cf6','#22c55e','#ec4899','#eab308','#06b6d4']
        return (
          <Card>
            <CardHeader><CardTitle>Výdaje po kategoriích a měsících</CardTitle></CardHeader>
            <CardContent>
              <Line
                data={{
                  labels: months.map(m => `${m}. měsíc`),
                  datasets: cats.map((cat, i) => ({
                    label: cat,
                    data: months.map(month => patterns.data?.patterns.find(p => p.category === cat && p.month === month)?.total ?? 0),
                    borderColor: colors[i % colors.length],
                    backgroundColor: colors[i % colors.length] + '20',
                    fill: false,
                    tension: 0.3,
                  }))
                }}
                options={{ responsive: true, plugins: { legend: { position: 'right' } }, scales: { y: { ticks: { callback: v => `${v} Kč` } } } }}
              />
            </CardContent>
          </Card>
        )
      })())}
    </div>
  )
}
