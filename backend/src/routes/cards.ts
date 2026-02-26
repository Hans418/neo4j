import { Router, Request, Response } from 'express'
import { runQuery } from '../db/neo4j'
import { getNode } from '../db/helpers'
import { AppError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})-[:OWNS]->(c:Card)
    RETURN c ORDER BY c.name
  `)
  res.json(records.map(r => getNode(r, 'c')))
})

router.get('/:id', async (req: Request, res: Response) => {
  const records = await runQuery(`MATCH (c:Card {id: $id}) RETURN c`, { id: req.params.id })
  if (!records.length) throw new AppError(404, 'Karta nenalezena')
  res.json(getNode(records[0], 'c'))
})

router.post('/', async (req: Request, res: Response) => {
  const { name, type, lastDigits, limit = null, linkedAccount } = req.body
  if (!name || !type || !lastDigits || !linkedAccount) throw new AppError(400, 'Chybí povinné pole')
  const id = `card-${Date.now()}`
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})
    MATCH (a:Account {id: $linkedAccount})
    CREATE (c:Card { id: $id, name: $name, type: $type, lastDigits: $lastDigits, limit: $limit, linkedAccount: $linkedAccount })
    CREATE (u)-[:OWNS]->(c)
    CREATE (a)-[:LINKED_TO]->(c)
    RETURN c
  `, { id, name, type, lastDigits, limit, linkedAccount })
  res.status(201).json(getNode(records[0], 'c'))
})

router.put('/:id', async (req: Request, res: Response) => {
  const { name, limit } = req.body
  const records = await runQuery(`
    MATCH (c:Card {id: $id})
    SET c += { name: COALESCE($name, c.name), limit: COALESCE($limit, c.limit) }
    RETURN c
  `, { id: req.params.id, name: name ?? null, limit: limit ?? null })
  if (!records.length) throw new AppError(404, 'Karta nenalezena')
  res.json(getNode(records[0], 'c'))
})

router.delete('/:id', async (req: Request, res: Response) => {
  await runQuery(`MATCH (c:Card {id: $id}) DETACH DELETE c`, { id: req.params.id })
  res.json({ message: 'Karta smazána' })
})

export default router
