import { Router, Request, Response } from 'express'
import { runQuery } from '../db/neo4j'
import { getNode } from '../db/helpers'
import { AppError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const { startDate, endDate, category, account, type } = req.query

  const params: Record<string, unknown> = {
    startDate: startDate ?? null,
    endDate:   endDate   ?? null,
    account:   account   ?? null,
    type:      type      ?? null,
    category:  category  ?? null,
  }

  const records = await runQuery(`
    MATCH (t:Transaction)-[:FROM]->(a:Account)<-[:HAS]-(u:User {id: 'user-001'})
    OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    OPTIONAL MATCH (parentCat:Category)-[:PARENT_OF]->(c)
    OPTIONAL MATCH (t)-[:SPENT_AT]->(m:Merchant)
    WITH t, a, c, parentCat, m
    WHERE ($startDate IS NULL OR t.date >= $startDate)
      AND ($endDate   IS NULL OR t.date <= $endDate)
      AND ($account   IS NULL OR a.id = $account)
      AND ($type      IS NULL OR t.type = $type)
      AND ($category  IS NULL OR c.id = $category OR parentCat.id = $category)
    RETURN t, a.id AS accountId, c.name AS categoryName, c.id AS categoryId,
           c.color AS categoryColor, m.name AS merchantName
    ORDER BY t.date DESC
  `, params)

  res.json(records.map(r => ({
    ...getNode(r, 't'),
    accountId:     r.get('accountId'),
    categoryId:    r.get('categoryId')    ?? null,
    categoryName:  r.get('categoryName')  ?? null,
    categoryColor: r.get('categoryColor') ?? null,
    merchantName:  r.get('merchantName')  ?? null,
  })))
})

router.get('/:id', async (req: Request, res: Response) => {
  const records = await runQuery(`
    MATCH (t:Transaction {id: $id})-[:FROM]->(a:Account)
    OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
    OPTIONAL MATCH (t)-[:SPENT_AT]->(m:Merchant)
    OPTIONAL MATCH (t)-[:TO]->(toAcc:Account)
    RETURN t, a.id AS accountId, c.name AS categoryName, c.id AS categoryId,
           m.name AS merchantName, toAcc.id AS toAccountId
  `, { id: req.params.id })
  if (!records.length) throw new AppError(404, 'Transakce nenalezena')
  const r = records[0]
  res.json({
    ...getNode(r, 't'),
    accountId:    r.get('accountId'),
    categoryId:   r.get('categoryId')   ?? null,
    categoryName: r.get('categoryName') ?? null,
    merchantName: r.get('merchantName') ?? null,
    toAccountId:  r.get('toAccountId')  ?? null,
  })
})

router.post('/', async (req: Request, res: Response) => {
  const { amount, description, type, accountId, categoryId = null, toAccountId = null, date } = req.body
  if (!amount || !description || !type || !accountId) throw new AppError(400, 'Chybí povinné pole')
  const id = `tx-${Date.now()}`
  const txDate = date ?? new Date().toISOString().split('T')[0]
  await runQuery(`
    MATCH (a:Account {id: $accountId})
    CREATE (t:Transaction { id: $id, date: $date, amount: $amount, description: $description, type: $type, status: 'completed' })
    CREATE (t)-[:FROM]->(a)
    WITH t
    OPTIONAL MATCH (c:Category {id: $categoryId})
    FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
      CREATE (t)-[:CATEGORIZED_AS {confidence: 1.0}]->(c)
    )
    WITH t
    OPTIONAL MATCH (toAcc:Account {id: $toAccountId})
    FOREACH (_ IN CASE WHEN toAcc IS NOT NULL THEN [1] ELSE [] END |
      CREATE (t)-[:TO]->(toAcc)
    )
    RETURN t
  `, { id, date: txDate, amount, description, type, accountId, categoryId, toAccountId })
  res.status(201).json({ id, date: txDate, amount, description, type, status: 'completed' })
})

router.put('/:id', async (req: Request, res: Response) => {
  const { description, categoryId } = req.body
  const records = await runQuery(`
    MATCH (t:Transaction {id: $id})
    SET t.description = COALESCE($description, t.description)
    WITH t
    OPTIONAL MATCH (t)-[rel:CATEGORIZED_AS]->()
    DELETE rel
    WITH t
    OPTIONAL MATCH (c:Category {id: $categoryId})
    FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
      CREATE (t)-[:CATEGORIZED_AS {confidence: 1.0}]->(c)
    )
    RETURN t
  `, { id: req.params.id, description: description ?? null, categoryId: categoryId ?? null })
  if (!records.length) throw new AppError(404, 'Transakce nenalezena')
  res.json(getNode(records[0], 't'))
})

router.delete('/:id', async (req: Request, res: Response) => {
  await runQuery(`MATCH (t:Transaction {id: $id}) DETACH DELETE t`, { id: req.params.id })
  res.json({ message: 'Transakce smazána' })
})

router.post('/import', async (req: Request, res: Response) => {
  const { transactions } = req.body as { transactions: { date: string; amount: number; description: string; type: string; accountId: string }[] }
  if (!Array.isArray(transactions)) throw new AppError(400, 'Očekáváno pole transactions')
  let created = 0
  for (const tx of transactions) {
    const id = `tx-import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    await runQuery(`
      MATCH (a:Account {id: $accountId})
      CREATE (t:Transaction { id: $id, date: $date, amount: $amount, description: $description, type: $type, status: 'completed' })
      CREATE (t)-[:FROM]->(a)
    `, { id, ...tx })
    created++
  }
  res.json({ message: `Importováno ${created} transakcí` })
})

export default router