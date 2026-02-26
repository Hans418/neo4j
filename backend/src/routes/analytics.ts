import { Router, Request, Response } from 'express'
import { runQuery } from '../db/neo4j'
import { toNumber } from '../db/helpers'

const router = Router()

router.get('/cashflow', async (req: Request, res: Response) => {
  const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7)
  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(a:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.date STARTS WITH $month
    OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    RETURN t.type AS type, t.amount AS amount, t.description AS description,
           a.id AS accountId, c.name AS categoryName
  `, { month })

  const income: { source: string; amount: number; account: string }[] = []
  const expenseMap = new Map<string, number>()
  let totalIncome = 0, totalExpenses = 0

  for (const r of records) {
    const type   = r.get('type') as string
    const amount = toNumber(r.get('amount'))
    const desc   = r.get('description') as string
    const acc    = r.get('accountId') as string
    const cat    = r.get('categoryName') as string | null

    if (type === 'income') {
      income.push({ source: desc, amount, account: acc })
      totalIncome += amount
    } else if (type === 'expense') {
      const key = cat ?? 'Ostatní'
      expenseMap.set(key, (expenseMap.get(key) ?? 0) + amount)
      totalExpenses += amount
    }
  }

  const expenses = Array.from(expenseMap.entries())
    .map(([category, amount]) => ({ category, amount, percentage: totalIncome > 0 ? Math.round(amount / totalIncome * 1000) / 10 : 0 }))
    .sort((a, b) => b.amount - a.amount)

  res.json({ month, income, totalIncome, expenses, totalExpenses, netCashflow: totalIncome - totalExpenses, savingsRate: totalIncome > 0 ? Math.round((totalIncome - totalExpenses) / totalIncome * 1000) / 1000 : 0 })
})

router.get('/cashflow-breakdown', async (req: Request, res: Response) => {
  const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7)
  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.date STARTS WITH $month AND t.type = 'expense'
    MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    OPTIONAL MATCH (parent:Category)-[:PARENT_OF]->(c)
    RETURN c.id AS catId, c.name AS catName, c.color AS color,
           parent.id AS parentId, parent.name AS parentName,
           SUM(t.amount) AS total
    ORDER BY total DESC
  `, { month })

  const parentMap = new Map<string, { id: string; name: string; color: string; amount: number; subcategories: { id: string; name: string; amount: number }[] }>()
  let grandTotal = 0

  for (const r of records) {
    const amount   = toNumber(r.get('total'))
    const catId    = r.get('catId') as string
    const catName  = r.get('catName') as string
    const color    = r.get('color') as string
    const parentId = r.get('parentId') as string | null
    grandTotal += amount

    if (parentId) {
      if (!parentMap.has(parentId)) parentMap.set(parentId, { id: parentId, name: r.get('parentName') as string, color, amount: 0, subcategories: [] })
      const parent = parentMap.get(parentId)!
      parent.amount += amount
      parent.subcategories.push({ id: catId, name: catName, amount })
    } else {
      if (!parentMap.has(catId)) parentMap.set(catId, { id: catId, name: catName, color, amount: 0, subcategories: [] })
      parentMap.get(catId)!.amount += amount
    }
  }

  const categories = Array.from(parentMap.values())
    .map(cat => ({ ...cat, percentage: grandTotal > 0 ? Math.round(cat.amount / grandTotal * 1000) / 10 : 0 }))
    .sort((a, b) => b.amount - a.amount)

  res.json({ month, totalExpenses: grandTotal, categories })
})

router.get('/spending-by-category', async (req: Request, res: Response) => {
  const months = parseInt(req.query.months as string ?? '3')
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  const lastMonthDate = new Date(now); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonth = lastMonthDate.toISOString().slice(0, 7)
  const fromDate = new Date(now); fromDate.setMonth(fromDate.getMonth() - months)
  const fromMonth = fromDate.toISOString().slice(0, 7)

  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.date >= $fromMonth AND t.type = 'expense'
    MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    WITH c, t.date[0..7] AS month, SUM(t.amount) AS total
    RETURN c.id AS catId, c.name AS catName, c.color AS color, month, total
  `, { fromMonth })

  const catMap = new Map<string, { id: string; name: string; color: string; byMonth: Map<string, number> }>()
  for (const r of records) {
    const catId = r.get('catId') as string
    if (!catMap.has(catId)) catMap.set(catId, { id: catId, name: r.get('catName') as string, color: r.get('color') as string, byMonth: new Map() })
    catMap.get(catId)!.byMonth.set(r.get('month') as string, toNumber(r.get('total')))
  }

  res.json(Array.from(catMap.values()).map(cat => ({
    categoryId:   cat.id,
    categoryName: cat.name,
    color:        cat.color,
    thisMonth:    cat.byMonth.get(currentMonth) ?? 0,
    lastMonth:    cat.byMonth.get(lastMonth) ?? 0,
    trend:        (cat.byMonth.get(currentMonth) ?? 0) - (cat.byMonth.get(lastMonth) ?? 0),
  })))
})

router.get('/anomalies', async (req: Request, res: Response) => {
  const threshold = parseFloat(req.query.threshold as string ?? '0.9')

  const statsRecords = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.type = 'expense'
    MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    WITH c.id AS catId, AVG(t.amount) AS avg, stDev(t.amount) AS stdDev
    RETURN catId, avg, stdDev
  `)
  const stats = new Map<string, { avg: number; stdDev: number }>()
  for (const r of statsRecords) stats.set(r.get('catId') as string, { avg: toNumber(r.get('avg')), stdDev: toNumber(r.get('stdDev')) })

  const txRecords = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.type = 'expense'
    OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    OPTIONAL MATCH (t)-[:SPENT_AT]->(m:Merchant)
    RETURN t, c.id AS catId, c.name AS catName, m.name AS merchantName
  `)

  const anomalies = []
  for (const r of txRecords) {
    const t        = getNodeProps(r.get('t'))
    const amount   = toNumber(t.amount)
    const catId    = r.get('catId') as string | null
    const catName  = r.get('catName') as string | null
    const metadata = (t.metadata as string) ?? ''
    let anomalyScore = 0
    const reasons: string[] = []

    if (catId && stats.has(catId)) {
      const { avg, stdDev } = stats.get(catId)!
      if (stdDev > 0) {
        const zScore = (amount - avg) / stdDev
        if (zScore > 2) { anomalyScore = Math.min(0.5 + zScore * 0.1, 0.95); reasons.push(`Částka ${Math.round(amount / avg * 10) / 10}x vyšší než průměr v kategorii ${catName} (průměr: ${Math.round(avg)} Kč)`) }
      }
    }
    if (metadata.includes('Kazakhstan')) { anomalyScore = Math.max(anomalyScore, 0.95); reasons.push('Transakce z neobvyklé lokace (Kazachstán)') }
    if (metadata.includes('03:'))        { anomalyScore = Math.max(anomalyScore, 0.85); reasons.push('Transakce ve 3:15 ráno – neobvyklý čas') }

    if (anomalyScore >= threshold) {
      anomalies.push({ transaction: { ...t, amount }, categoryName: catName, merchantName: r.get('merchantName'), anomalyScore: Math.round(anomalyScore * 100) / 100, reasons, recommendation: 'Ověř u své banky – může jít o podvod' })
    }
  }
  res.json({ anomalies, threshold })
})

router.get('/spending-flow', async (req: Request, res: Response) => {
  const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7)
  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(a:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.date STARTS WITH $month
    OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    RETURN t.type AS type, t.amount AS amount, t.description AS description,
           a.id AS accId, a.name AS accName, c.id AS catId, c.name AS catName, c.color AS catColor
  `, { month })

  const nodes = new Map<string, { id: string; type: string; label: string; color?: string }>()
  const edgeMap = new Map<string, { from: string; to: string; amount: number }>()

  for (const r of records) {
    const type    = r.get('type') as string
    const amount  = toNumber(r.get('amount'))
    const desc    = r.get('description') as string
    const accId   = r.get('accId') as string
    const accName = r.get('accName') as string
    const catId   = r.get('catId') as string | null
    const catName = r.get('catName') as string | null
    const catColor = r.get('catColor') as string | null

    nodes.set(accId, { id: accId, type: 'account', label: accName })
    if (type === 'income') {
      const srcId = `src-${desc.replace(/\s+/g, '-').toLowerCase()}`
      nodes.set(srcId, { id: srcId, type: 'income', label: desc })
      const key = `${srcId}->${accId}`
      edgeMap.set(key, { from: srcId, to: accId, amount: (edgeMap.get(key)?.amount ?? 0) + amount })
    } else if (type === 'expense' && catId) {
      nodes.set(catId, { id: catId, type: 'category', label: catName!, color: catColor ?? undefined })
      const key = `${accId}->${catId}`
      edgeMap.set(key, { from: accId, to: catId, amount: (edgeMap.get(key)?.amount ?? 0) + amount })
    }
  }
  res.json({ month, nodes: Array.from(nodes.values()), edges: Array.from(edgeMap.values()) })
})

router.get('/account-flow', async (req: Request, res: Response) => {
  const { account } = req.query
  if (!account) { res.status(400).json({ error: 'Chybí parametr account' }); return }
  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(a:Account {id: $account})
    OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    RETURN t.type AS type, t.amount AS amount, c.name AS catName
  `, { account })

  let inflow = 0, outflow = 0
  const breakdown = new Map<string, number>()
  for (const r of records) {
    const type   = r.get('type') as string
    const amount = toNumber(r.get('amount'))
    const cat    = r.get('catName') as string | null
    if (type === 'income') inflow += amount
    else { outflow += amount; breakdown.set(cat ?? 'Ostatní', (breakdown.get(cat ?? 'Ostatní') ?? 0) + amount) }
  }
  res.json({ accountId: account, inflow, outflow, netFlow: inflow - outflow, breakdown: Array.from(breakdown.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount) })
})

router.get('/year-in-review', async (req: Request, res: Response) => {
  const year = (req.query.year as string) ?? new Date().getFullYear().toString()
  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.date STARTS WITH $year
    OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    RETURN t.type AS type, t.amount AS amount, c.name AS catName, t.date[5..7] AS month
  `, { year })

  let totalIncome = 0, totalExpenses = 0
  const byCat = new Map<string, number>()
  const byMonth = new Map<string, { income: number; expenses: number }>()

  for (const r of records) {
    const type   = r.get('type') as string
    const amount = toNumber(r.get('amount'))
    const cat    = r.get('catName') as string | null
    const month  = r.get('month') as string
    if (!byMonth.has(month)) byMonth.set(month, { income: 0, expenses: 0 })
    if (type === 'income') { totalIncome += amount; byMonth.get(month)!.income += amount }
    else if (type === 'expense') { totalExpenses += amount; byMonth.get(month)!.expenses += amount; byCat.set(cat ?? 'Ostatní', (byCat.get(cat ?? 'Ostatní') ?? 0) + amount) }
  }

  res.json({
    year,
    totalIncome,
    totalExpenses,
    netSavings: totalIncome - totalExpenses,
    savingsRate: totalIncome > 0 ? Math.round((totalIncome - totalExpenses) / totalIncome * 1000) / 10 : 0,
    topExpenseCategories: Array.from(byCat.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5),
    monthlyBreakdown: Array.from(byMonth.entries()).map(([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month))
  })
})

router.get('/spending-patterns', async (req: Request, res: Response) => {
  const months = parseInt(req.query.months as string ?? '6')
  const from = new Date(); from.setMonth(from.getMonth() - months)
  const fromDate = from.toISOString().split('T')[0]
  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.date >= $fromDate AND t.type = 'expense'
    OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    RETURN t.date[5..7] AS month, c.name AS catName, SUM(t.amount) AS total, COUNT(t) AS count
    ORDER BY month, total DESC
  `, { fromDate })

  res.json({ months, patterns: records.map(r => ({ month: r.get('month') as string, category: (r.get('catName') as string) ?? 'Ostatní', total: toNumber(r.get('total')), count: toNumber(r.get('count')) })) })
})

// helper – bez importu getNode abychom se vyhnuli circular deps
function getNodeProps(node: { properties: Record<string, unknown> }) {
  return node?.properties ?? {}
}

export default router
