import { Router, Request, Response } from 'express'
import { runQuery } from '../db/neo4j'
import { getNode } from '../db/helpers'
import { AppError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})-[:HAS]->(c:Category)
    OPTIONAL MATCH (parent:Category)-[:PARENT_OF]->(c)
    RETURN c, parent.id AS parentId
    ORDER BY c.type, c.name
  `)
  res.json(records.map(r => ({ ...getNode(r, 'c'), parentId: r.get('parentId') ?? null })))
})

router.get('/:id', async (req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (c:Category {id: $id})
    OPTIONAL MATCH (parent:Category)-[:PARENT_OF]->(c)
    OPTIONAL MATCH (c)-[:PARENT_OF]->(child:Category)
    RETURN c, parent.id AS parentId, collect(child) AS children
  `, { id: req.params.id })
  if (!records.length) throw new AppError(404, 'Kategorie nenalezena')
  const r = records[0]
  const children = (r.get('children') as { properties: Record<string, unknown> }[]).map(ch => ch.properties)
  res.json({ ...getNode(r, 'c'), parentId: r.get('parentId') ?? null, children })
})

router.post('/', async (req: Request, res: Response) => {
  const { name, type, color = '#6b7280', budget = null, parentId = null } = req.body
  if (!name || !type) throw new AppError(400, 'Chybí povinné pole: name, type')
  const id = `cat-${Date.now()}`
  const records = await runQuery(`
    MATCH (u:User {id: 'user-001'})
    CREATE (c:Category { id: $id, name: $name, type: $type, color: $color, budget: $budget })
    CREATE (u)-[:HAS]->(c)
    WITH c
    OPTIONAL MATCH (parent:Category {id: $parentId})
    FOREACH (_ IN CASE WHEN parent IS NOT NULL THEN [1] ELSE [] END |
      CREATE (parent)-[:PARENT_OF]->(c)
    )
    RETURN c
  `, { id, name, type, color, budget, parentId })
  res.status(201).json(getNode(records[0], 'c'))
})

router.put('/:id', async (req: Request, res: Response) => {
  const { name, color, budget } = req.body
  const records = await runQuery(`
    MATCH (c:Category {id: $id})
    SET c += { name: COALESCE($name, c.name), color: COALESCE($color, c.color), budget: COALESCE($budget, c.budget) }
    RETURN c
  `, { id: req.params.id, name: name ?? null, color: color ?? null, budget: budget ?? null })
  if (!records.length) throw new AppError(404, 'Kategorie nenalezena')
  res.json(getNode(records[0], 'c'))
})

router.delete('/:id', async (req: Request, res: Response) => {
  await runQuery(`MATCH (c:Category {id: $id}) DETACH DELETE c`, { id: req.params.id })
  res.json({ message: 'Kategorie smazána' })
})

export default router
