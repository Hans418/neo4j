import { useState } from 'react'
import { api, type Transaction } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatCZK, formatDate, cn } from '@/lib/utils'
import { Card, CardContent, LoadingState, ErrorState, Badge, Button } from '@/components/ui'
import { Search, Filter } from 'lucide-react'

const typeBadge = (type: Transaction['type']) => {
  if (type === 'income')   return <Badge variant="success">Příjem</Badge>
  if (type === 'transfer') return <Badge variant="muted">Převod</Badge>
  return <Badge variant="danger">Výdaj</Badge>
}

export const Transactions = () => {
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const categories = useApi(() => api.categories.list())
  const transactions = useApi(
    () => api.transactions.list({
      ...(typeFilter     ? { type: typeFilter }         : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
    }),
    [typeFilter, categoryFilter]
  )

  const filtered = transactions.data?.filter(t =>
    !search || t.description.toLowerCase().includes(search.toLowerCase()) ||
    (t.merchantName ?? '').toLowerCase().includes(search.toLowerCase())
  ) ?? []
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Transakce</h1>

      {/* Filtry */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hledat v popisech..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">Všechny typy</option>
              <option value="expense">Výdaje</option>
              <option value="income">Příjmy</option>
              <option value="transfer">Převody</option>
            </select>
            <select
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">Všechny kategorie</option>
              {categories.data?.filter(c => !c.parentId).map((c, i) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {(typeFilter || categoryFilter || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setTypeFilter(''); setCategoryFilter(''); setSearch('') }}>
                Smazat filtry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabulka */}
      <Card>
        <CardContent className="p-0">
          {transactions.loading ? <LoadingState /> : transactions.error ? <ErrorState message={transactions.error} /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-400">
                  <th className="px-5 py-3 font-medium">Datum</th>
                  <th className="px-5 py-3 font-medium">Popis</th>
                  <th className="px-5 py-3 font-medium">Kategorie</th>
                  <th className="px-5 py-3 font-medium">Typ</th>
                  <th className="px-5 py-3 text-right font-medium">Částka</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">Žádné transakce</td></tr>
                )}
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{formatDate(t.date)}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{t.description}</p>
                      {t.merchantName && <p className="text-xs text-gray-400">{t.merchantName}</p>}
                    </td>
                    <td className="px-5 py-3">
                      {t.categoryName && (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.categoryColor ?? '#ccc' }} />
                          {t.categoryName}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">{typeBadge(t.type)}</td>
                    <td className={cn('px-5 py-3 text-right font-semibold tabular-nums',
                      t.type === 'income' ? 'text-green-600' : t.type === 'transfer' ? 'text-gray-500' : 'text-red-500'
                    )}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCZK(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{filtered.length} transakcí</p>
      )}
    </div>
  )
}
