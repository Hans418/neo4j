import { useState } from 'react'
import { api, type Goal } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatCZK, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, LoadingState, ErrorState, Progress, Badge, Button } from '@/components/ui'
import { Target, TrendingUp, Calendar } from 'lucide-react'

const riskBadge = (r: string) => {
  if (r === 'low')    return <Badge variant="success">Nízké riziko</Badge>
  if (r === 'high')   return <Badge variant="danger">Vysoké riziko</Badge>
  return <Badge variant="warning">Střední riziko</Badge>
}

const GoalDetail = ({ goal }: { goal: Goal }) => {
  const [open, setOpen] = useState(false)
  const forecast = useApi(() => open ? api.goals.forecast(goal.id) : Promise.resolve(null), [open])

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{goal.name}</h3>
            <div className="flex gap-2 mt-1">
              {riskBadge(goal.riskProfile)}
              <Badge variant="muted">{goal.type}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)}>
            {open ? 'Skrýt' : 'Prognóza'}
          </Button>
        </div>

        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">{formatCZK(goal.currentAmount)} naspořeno</span>
          <span className="font-medium text-gray-700">{formatCZK(goal.targetAmount)} cíl</span>
        </div>

        <Progress
          value={goal.progressPercent ?? 0}
          color={goal.progressPercent && goal.progressPercent >= 80 ? 'bg-green-500' : 'bg-blue-500'}
        />

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Target size={12} />{goal.progressPercent ?? 0} %</span>
          <span className="flex items-center gap-1"><Calendar size={12} />Deadline: {formatDate(goal.deadline)}</span>
          <span className="flex items-center gap-1"><TrendingUp size={12} />Zbývá: {formatCZK(goal.targetAmount - goal.currentAmount)}</span>
        </div>

        {open && (
          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            {forecast.loading ? <LoadingState text="Načítám prognózu..." /> : forecast.data && (
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Odhadované datum dosažení:</span> <strong>{formatDate(forecast.data.estimatedDate)}</strong></p>
                <p><span className="text-gray-500">Potřebná měsíční úspora:</span> <strong>{formatCZK(forecast.data.requiredMonthlyAmount)}</strong></p>
                <p><span className="text-gray-500">Zbývá měsíců:</span> <strong>{forecast.data.monthsNeeded}</strong></p>
                <p>
                  <span className="text-gray-500">Stav: </span>
                  {forecast.data.onTrack
                    ? <Badge variant="success">Na správné cestě ✓</Badge>
                    : <Badge variant="danger">Zpoždění – zvýšit spoření</Badge>
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const Goals = () => {
  const { data, loading, error } = useApi(() => api.goals.list())

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Finanční cíle</h1>
      <div className="grid grid-cols-1 gap-4">
        {data?.map(g => <GoalDetail key={g.id} goal={g} />)}
      </div>
    </div>
  )
}
