import { Router, Request, Response } from 'express'
import { runQuery } from '../db/neo4j'
import { getNode } from '../db/helpers'
import { AppError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})-[:HAS]->(a:Account)
    RETURN a ORDER BY a.name
  `)
  res.json(records.map(r => getNode(r, 'a')))
})

router.get('/:id', async (req: Request, res: Response) => {
  const records = await runQuery(`MATCH (a:Account {id: $id}) RETURN a`, { id: req.params.id })
  if (!records.length) throw new AppError(404, 'Účet nenalezen')
  res.json(getNode(records[0], 'a'))
})

router.post('/', async (req: Request, res: Response) => {
  const { name, type, balance = 0, bank } = req.body
  if (!name || !type || !bank) throw new AppError(400, 'Chybí povinné pole: name, type, bank')
  const id = `acc-${Date.now()}`
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})
    CREATE (a:Account { id: $id, name: $name, type: $type, balance: $balance, bank: $bank, createdAt: $createdAt })
    CREATE (u)-[:HAS {primaryAccount: false}]->(a)
    RETURN a
  `, { id, name, type, balance, bank, createdAt: new Date().toISOString().split('T')[0] })
  res.status(201).json(getNode(records[0], 'a'))
})

router.put('/:id', async (req: Request, res: Response) => {
  const { name, balance, bank } = req.body
  const records = await runQuery(`
    MATCH (a:Account {id: $id})
    SET a += { name: COALESCE($name, a.name), balance: COALESCE($balance, a.balance), bank: COALESCE($bank, a.bank) }
    RETURN a
  `, { id: req.params.id, name: name ?? null, balance: balance ?? null, bank: bank ?? null })
  if (!records.length) throw new AppError(404, 'Účet nenalezen')
  res.json(getNode(records[0], 'a'))
})

router.delete('/:id', async (req: Request, res: Response) => {
  await runQuery(`MATCH (a:Account {id: $id}) DETACH DELETE a`, { id: req.params.id })
  res.json({ message: 'Účet smazán' })
})

export default router
