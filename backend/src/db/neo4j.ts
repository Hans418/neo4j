import neo4j, { Driver, Session, RecordShape } from 'neo4j-driver'

let driver: Driver

export const getDriver = (): Driver => {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password123'
      )
    )
  }
  return driver
}

export const runQuery = async <T extends RecordShape>(
  query: string,
  params: Record<string, unknown> = {}
) => {
  const session: Session = getDriver().session()
  try {
    const result = await session.run<T>(query, params)
    return result.records
  } finally {
    await session.close()
  }
}

export const closeDriver = async () => {
  if (driver) {
    await driver.close()
  }
}
