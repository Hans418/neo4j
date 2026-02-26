import { Router, Request, Response } from 'express'
import { runQuery } from '../db/neo4j'
import { getNode, toNumber } from '../db/helpers'
import { AppError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})-[:CONTRIBUTES_TO]->(g:Goal)
    RETURN g ORDER BY g.deadline
  `)
  res.json(records.map(r => {
    const g = getNode(r, 'g')
    const target  = toNumber(g.targetAmount)
    const current = toNumber(g.currentAmount)
    return { ...g, progressPercent: target > 0 ? Math.round((current / target) * 100) : 0 }
  }))
})

router.get('/:id', async (req: Request, res: Response) => {
  const records = await runQuery(`MATCH (g:Goal {id: $id}) RETURN g`, { id: req.params.id })
  if (!records.length) throw new AppError(404, 'Cíl nenalezen')
  const g = getNode(records[0], 'g')
  const target  = toNumber(g.targetAmount)
  const current = toNumber(g.currentAmount)
  res.json({ ...g, progressPercent: target > 0 ? Math.round((current / target) * 100) : 0 })
})

router.post('/', async (req: Request, res: Response) => {
  const { name, type, targetAmount, currentAmount = 0, deadline, riskProfile = 'medium' } = req.body
  if (!name || !type || !targetAmount || !deadline) throw new AppError(400, 'Chybí povinné pole')
  const id = `goal-${Date.now()}`
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})
    CREATE (g:Goal { id: $id, name: $name, type: $type, targetAmount: $targetAmount, currentAmount: $currentAmount, deadline: $deadline, riskProfile: $riskProfile })
    CREATE (u)-[:CONTRIBUTES_TO {transactionHistory: []}]->(g)
    RETURN g
  `, { id, name, type, targetAmount, currentAmount, deadline, riskProfile })
  res.status(201).json(getNode(records[0], 'g'))
})

router.put('/:id', async (req: Request, res: Response) => {
  const { name, targetAmount, currentAmount, deadline } = req.body
  const records = await runQuery(`
    MATCH (g:Goal {id: $id})
    SET g += {
      name: COALESCE($name, g.name),
      targetAmount: COALESCE($targetAmount, g.targetAmount),
      currentAmount: COALESCE($currentAmount, g.currentAmount),
      deadline: COALESCE($deadline, g.deadline)
    }
    RETURN g
  `, { id: req.params.id, name: name ?? null, targetAmount: targetAmount ?? null, currentAmount: currentAmount ?? null, deadline: deadline ?? null })
  if (!records.length) throw new AppError(404, 'Cíl nenalezen')
  res.json(getNode(records[0], 'g'))
})

router.delete('/:id', async (req: Request, res: Response) => {
  await runQuery(`MATCH (g:Goal {id: $id}) DETACH DELETE g`, { id: req.params.id })
  res.json({ message: 'Cíl smazán' })
})

router.get('/:id/contributions', async (req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (t:Transaction)-[:CONTRIBUTES_TO]->(g:Goal {id: $id})
    RETURN t ORDER BY t.date DESC
  `, { id: req.params.id })
  res.json(records.map(r => getNode(r, 't')))
})

router.get('/:id/forecast', async (req: Request, res: Response) => {
  const records = await runQuery(`MATCH (g:Goal {id: $id}) RETURN g`, { id: req.params.id })
  if (!records.length) throw new AppError(404, 'Cíl nenalezen')
  const g = getNode(records[0], 'g')
  const target  = toNumber(g.targetAmount)
  const current = toNumber(g.currentAmount)
  const remaining = target - current
  const avgMonthly = 15000
  const monthsNeeded = remaining > 0 ? Math.ceil(remaining / avgMonthly) : 0
  const estimatedDate = new Date()
  estimatedDate.setMonth(estimatedDate.getMonth() + monthsNeeded)
  res.json({
    goalId: req.params.id,
    targetAmount: target,
    currentAmount: current,
    remaining,
    avgMonthlySavings: avgMonthly,
    monthsNeeded,
    estimatedDate: estimatedDate.toISOString().split('T')[0],
    requiredMonthlyAmount: Math.ceil(remaining / Math.max(monthsNeeded, 1)),
    onTrack: new Date(g.deadline as string) >= estimatedDate
  })
})

export default router
