import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatCZK, cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent, LoadingState, ErrorState, Progress, Badge } from '@/components/ui'

export const Budget = () => {
  const budgets = useApi(() => api.budgets.list())
  const latestBudget = budgets.data?.[0]
  const vsActual = useApi(
    () => latestBudget ? api.budgets.vsActual(latestBudget.id) : Promise.resolve([]),
    [latestBudget?.id]
  )

  if (budgets.loading) return <LoadingState />
  if (budgets.error)   return <ErrorState message={budgets.error} />
  if (!latestBudget)   return <p className="text-gray-400 py-10 text-center">Žádný rozpočet nenalezen</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rozpočet</h1>
          <p className="text-sm text-gray-400 mt-1">{latestBudget.month}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Dodržování rozpočtu</p>
          <p className="text-2xl font-bold text-blue-600">{Math.round((latestBudget.adherence ?? 0) * 100)} %</p>
        </div>
      </div>

      {vsActual.loading ? <LoadingState /> : vsActual.error ? <ErrorState message={vsActual.error} /> : (
        <div className="grid grid-cols-1 gap-4">
          {vsActual.data?.filter(c => c.planned > 0).map(cat => {
            const pct = cat.percentageUsed
            const over = pct > 100
            const warn = pct > 80
            return (
              <Card key={cat.categoryId}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-gray-800">{cat.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-400">{formatCZK(cat.actual)} / {formatCZK(cat.planned)}</span>
                      {over
                        ? <Badge variant="danger">Překročeno o {formatCZK(cat.actual - cat.planned)}</Badge>
                        : warn
                        ? <Badge variant="warning">{pct} %</Badge>
                        : <Badge variant="success">{pct} %</Badge>
                      }
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    color={cn(over ? 'bg-red-500' : warn ? 'bg-yellow-400' : 'bg-green-500')}
                  />
                  {!over && (
                    <p className="text-xs text-gray-400 mt-1">Zbývá: {formatCZK(cat.remaining)}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
