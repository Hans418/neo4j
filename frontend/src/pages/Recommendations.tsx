import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatCZK } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, LoadingState, ErrorState, Badge } from '@/components/ui'
import { Lightbulb, TrendingUp, PiggyBank } from 'lucide-react'

const priorityBadge = (p: string) => {
  if (p === 'high')   return <Badge variant="danger">Vysoká priorita</Badge>
  if (p === 'medium') return <Badge variant="warning">Střední priorita</Badge>
  return <Badge variant="muted">Nízká priorita</Badge>
}

const riskBadge = (r: string) => {
  if (r === 'low')    return <Badge variant="success">Nízké riziko</Badge>
  if (r === 'high')   return <Badge variant="danger">Vysoké riziko</Badge>
  return <Badge variant="warning">Střední riziko</Badge>
}

export const Recommendations = () => {
  const savings    = useApi(() => api.recommendations.savings())
  const investment = useApi(() => api.recommendations.investment())

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Doporučení</h1>

      {/* Úsporná doporučení */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank size={18} className="text-green-600" />
          <h2 className="text-lg font-semibold text-gray-800">Kde ušetřit</h2>
        </div>
        {savings.loading ? <LoadingState /> : savings.error ? <ErrorState message={savings.error} /> : (
          <>
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm">
              <span className="text-gray-600">Celkový potenciál úspor: </span>
              <strong className="text-green-700 text-base">{formatCZK(savings.data?.totalPotentialSavings ?? 0)} / měsíc</strong>
            </div>
            <div className="space-y-4">
              {savings.data?.recommendations.map((rec, i) => (
                <Card key={i}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb size={16} className="text-yellow-500" />
                        <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                      </div>
                      <div className="flex gap-2">
                        {priorityBadge(rec.priority)}
                      </div>
                    </div>

                    {rec.services && (
                      <div className="mb-3 space-y-1">
                        {rec.services.map((s, j) => (
                          <div key={j} className="flex justify-between text-sm text-gray-500">
                            <span>{s.name}</span>
                            <span>{formatCZK(s.amount)}/měs</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mb-3">{rec.suggestion}</p>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Aktuální útrata: {formatCZK(rec.currentSpending)}/měs</span>
                      <span className="font-semibold text-green-600">Úspora: {formatCZK(rec.potentialSavings)}/měs</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Investiční doporučení */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Kam investovat</h2>
        </div>
        {investment.loading ? <LoadingState /> : investment.error ? <ErrorState message={investment.error} /> : (
          <>
            <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm">
              <span className="text-gray-600">Odhadovaný volný cash: </span>
              <strong className="text-blue-700 text-base">{formatCZK(investment.data?.estimatedFreeCash ?? 0)}</strong>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {investment.data?.recommendations.map((rec, i) => (
                <Card key={i}>
                  <CardContent className="pt-5 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{rec.asset}</h3>
                      {riskBadge(rec.risk)}
                    </div>
                    <p className="text-lg font-bold text-blue-600">{rec.expectedReturn}</p>
                    <p className="text-xs text-gray-500">{rec.reason}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
