import { Router, Request, Response } from 'express'
import { runQuery } from '../db/neo4j'
import { getNode, toNumber } from '../db/helpers'
import { AppError } from '../middleware/errorHandler'
import type { BudgetVsActual } from '../types'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})-[rel:FOLLOWS_BUDGET]->(b:BudgetPlan)
    RETURN b, rel.adherence AS adherence ORDER BY b.month DESC
  `)
  res.json(records.map(r => ({ ...getNode(r, 'b'), adherence: r.get('adherence') })))
})

router.get('/:id', async (req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (b:BudgetPlan {id: $id})<-[rel:FOLLOWS_BUDGET]-(u:User {id: 'user-001'})
    RETURN b, rel.adherence AS adherence
  `, { id: req.params.id })
  if (!records.length) throw new AppError(404, 'Rozpočet nenalezen')
  const r = records[0]
  res.json({ ...getNode(r, 'b'), adherence: r.get('adherence') })
})

router.post('/', async (req: Request, res: Response) => {
  const { month, notes = '' } = req.body
  if (!month) throw new AppError(400, 'Chybí povinné pole: month')
  const id = `budget-${month}`
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})
    CREATE (b:BudgetPlan { id: $id, month: $month, notes: $notes })
    CREATE (u)-[:FOLLOWS_BUDGET {month: $month, adherence: 0}]->(b)
    RETURN b
  `, { id, month, notes })
  res.status(201).json(getNode(records[0], 'b'))
})

router.put('/:id', async (req: Request, res: Response) => {
  const { notes } = req.body
  const records = await runQuery(`
    MATCH (b:BudgetPlan {id: $id})
    SET b.notes = COALESCE($notes, b.notes)
    RETURN b
  `, { id: req.params.id, notes: notes ?? null })
  if (!records.length) throw new AppError(404, 'Rozpočet nenalezen')
  res.json(getNode(records[0], 'b'))
})

router.delete('/:id', async (req: Request, res: Response) => {
  await runQuery(`MATCH (b:BudgetPlan {id: $id}) DETACH DELETE b`, { id: req.params.id })
  res.json({ message: 'Rozpočet smazán' })
})

router.get('/:id/vs-actual', async (req: Request, res: Response) => {
  const { category = 'all' } = req.query
  const records = await runQuery(`
    MATCH (b:BudgetPlan {id: $id})<-[:FOLLOWS_BUDGET]-(u:User {id: 'user-001'})
    MATCH (u)-[:HAS]->(cat:Category {type: 'expense'})
    WHERE $category = 'all' OR cat.id = $category
    OPTIONAL MATCH (t:Transaction)-[:CATEGORIZED_AS]->(cat)
    WHERE t.date STARTS WITH b.month AND t.type = 'expense'
    WITH cat, SUM(t.amount) AS actual
    WHERE cat.budget IS NOT NULL
    RETURN cat.id AS categoryId, cat.name AS categoryName,
           cat.color AS color, cat.budget AS planned, actual
    ORDER BY cat.name
  `, { id: req.params.id, category })

  const result: BudgetVsActual[] = records.map(r => {
    const planned = toNumber(r.get('planned')) || 0
    const actual  = toNumber(r.get('actual'))  || 0
    return {
      categoryId:      r.get('categoryId') as string,
      categoryName:    r.get('categoryName') as string,
      color:           r.get('color') as string,
      planned,
      actual,
      remaining:       planned - actual,
      percentageUsed:  planned > 0 ? Math.round((actual / planned) * 100) : 0,
    }
  })
  res.json(result)
})

export default router
