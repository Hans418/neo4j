import { Router, Request, Response } from 'express'
import { runQuery } from '../db/neo4j'
import { toNumber } from '../db/helpers'

const router = Router()

router.get('/savings', async (_req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.type = 'expense'
    MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    OPTIONAL MATCH (t)-[:SPENT_AT]->(m:Merchant)
    WITH c, m, SUM(t.amount) AS total, COUNT(t) AS txCount
    RETURN c.id AS catId, c.name AS catName, m.id AS merchantId,
           m.name AS merchantName, total, txCount
    ORDER BY total DESC
  `)

  const merchantMap = new Map<string, { name: string; total: number; count: number; catId: string; catName: string }>()
  for (const r of records) {
    const mid = r.get('merchantId') as string | null
    if (!mid) continue
    merchantMap.set(mid, {
      name:    r.get('merchantName') as string,
      total:   toNumber(r.get('total')),
      count:   toNumber(r.get('txCount')),
      catId:   r.get('catId') as string,
      catName: r.get('catName') as string,
    })
  }

  const recommendations = []

  const streamingServices = Array.from(merchantMap.values()).filter(m => m.catId === 'cat-streaming')
  if (streamingServices.length >= 2) {
    const total = streamingServices.reduce((s, m) => s + m.total, 0)
    recommendations.push({
      title: 'Streaming služby',
      currentSpending: total,
      services: streamingServices.map(s => ({ name: s.name, amount: s.total })),
      suggestion: `Máš ${streamingServices.length} streaming služby – zkontroluj, které skutečně využíváš`,
      potentialSavings: Math.round(total * 0.4),
      priority: streamingServices.length >= 3 ? 'high' : 'medium'
    })
  }

  const cafes = Array.from(merchantMap.values()).filter(m => m.catId === 'cat-kavarny')
  const cafeTotal = cafes.reduce((s, m) => s + m.total, 0)
  if (cafeTotal > 300) {
    recommendations.push({
      title: 'Kavárny',
      currentSpending: cafeTotal,
      frequency: cafes.reduce((s, m) => s + m.count, 0) + 'x za sledované období',
      suggestion: 'Nákup kávovaru za ~5 000 Kč se vrátí za méně než 2 měsíce',
      potentialSavings: Math.round(cafeTotal * 0.6),
      priority: cafeTotal > 1000 ? 'high' : 'medium'
    })
  }

  res.json({ recommendations, totalPotentialSavings: recommendations.reduce((s, r) => s + r.potentialSavings, 0) })
})

router.get('/investment', async (_req: Request, res: Response) => {
  const month = new Date().toISOString().slice(0, 7)
  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.date STARTS WITH $month
    RETURN t.type AS type, SUM(t.amount) AS total
  `, { month })

  let freeCash = 0
  for (const r of records) {
    const type  = r.get('type') as string
    const total = toNumber(r.get('total'))
    if (type === 'income') freeCash += total
    else freeCash -= total
  }

  res.json({
    estimatedFreeCash: Math.max(freeCash, 0),
    recommendations: [
      { asset: 'ETF – S&P 500 (iShares Core)', expectedReturn: '8–10 % p.a.', risk: 'medium', reason: 'Diverzifikovaný pasivní fond, dlouhodobě spolehlivý základ portfolia' },
      { asset: 'Spořicí účet (4 % p.a.)',      expectedReturn: '4 % p.a.',    risk: 'low',    reason: 'Bezpečné zhodnocení likvidní rezervy, vhodné pro krátkodobé cíle' },
      { asset: 'Státní dluhopisy ČR',            expectedReturn: '5–6 % p.a.', risk: 'low',    reason: 'Nízké riziko, stabilní výnos v CZK bez kurzového rizika' },
    ]
  })
})

router.get('/budget-adjustment', async (req: Request, res: Response) => {
  const { category } = req.query
  const conditions = category ? 'WHERE c.id = $category' : ''
  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(:Account)<-[:HAS]-(u:User {id: 'user-001'})
    WHERE t.type = 'expense'
    MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    ${conditions}
    WITH c, t.date[0..7] AS month, SUM(t.amount) AS total
    RETURN c.id AS catId, c.name AS catName, c.budget AS currentBudget, month, total
    ORDER BY c.name, month
  `, { category: category ?? null })

  const catMap = new Map<string, { name: string; budget: number; months: number[] }>()
  for (const r of records) {
    const catId  = r.get('catId') as string
    const name   = r.get('catName') as string
    const budget = toNumber(r.get('currentBudget'))
    const total  = toNumber(r.get('total'))
    if (!catMap.has(catId)) catMap.set(catId, { name, budget, months: [] })
    catMap.get(catId)!.months.push(total)
  }

  const suggestions = Array.from(catMap.entries()).map(([catId, data]) => {
    const avg = data.months.reduce((s, v) => s + v, 0) / (data.months.length || 1)
    const recommendedBudget = Math.round(avg * 1.1 / 100) * 100
    return {
      categoryId:        catId,
      categoryName:      data.name,
      currentBudget:     data.budget,
      avgSpending:       Math.round(avg),
      recommendedBudget,
      difference:        recommendedBudget - data.budget,
      reason:            avg > data.budget
        ? `Průměrně překračuješ rozpočet o ${Math.round(avg - data.budget)} Kč`
        : `Rozpočet je o ${Math.round(data.budget - avg)} Kč výše než průměrná útrata`
    }
  })

  res.json({ suggestions })
})

export default router
