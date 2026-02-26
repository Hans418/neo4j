import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { runQuery, closeDriver } from './db/neo4j'
import { errorHandler } from './middleware/errorHandler'

import accountsRouter from './routes/accounts'
import cardsRouter from './routes/cards'
import transactionsRouter from './routes/transactions'
import categoriesRouter from './routes/categories'
import goalsRouter from './routes/goals'
import budgetsRouter from './routes/budgets'
import analyticsRouter from './routes/analytics'
import recommendationsRouter from './routes/recommendations'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await runQuery('RETURN 1')
        res.json({ status: 'ok', neo4j: 'connected' })
    } catch (e) {
        res.status(500).json({ status: 'error', message: (e as Error).message })
    }
})

// Routes
app.use('/api/accounts', accountsRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/goals', goalsRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/recommendations', recommendationsRouter)

// Error handler (musí být poslední)
app.use(errorHandler)

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📊 Neo4j browser: http://localhost:7474`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...')
    server.close(async () => {
        await closeDriver()
        process.exit(0)
    })
})